import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Ingestione dati Garmin ricchi (dal Garmin-Bridge) nei modelli normalizzati.
// Le tabelle in ingresso sono righe PULITE lette da garmin.db dal bridge
// (colonne piatte snake_case). Qui mappiamo + convertiamo le unità.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;
export interface GarminTables {
  sleep?: Row[];
  hrv?: Row[];
  daily_summary?: Row[];
  training_status?: Row[];
  training_readiness?: Row[];
  vo2max?: Row[];
  hydration?: Row[];
  activity?: Row[];
  activity_splits?: Row[];
  activity_weather?: Row[];
  running_dynamics?: Row[];
  activity_hr_zones?: Row[];
}

export interface ImportSummary {
  dailyMetrics: number;
  sleepRecords: number;
  activities: number;
  streams: number;
  environments: number;
}

// ── helper di coercizione/conversione ──────────────────────────────
const num = (x: unknown): number | null => {
  if (x === null || x === undefined || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
};
const int = (x: unknown): number | null => {
  const n = num(x);
  return n === null ? null : Math.round(n);
};
/** interi con sentinella Garmin "-1" (nessun dato) → null */
const posInt = (x: unknown): number | null => {
  const n = int(x);
  return n === null || n < 0 ? null : n;
};
const str = (x: unknown): string | null =>
  x === null || x === undefined ? null : String(x);
const fToC = (x: unknown): number | null => {
  const n = num(x);
  return n === null ? null : Math.round(((n - 32) * 5) / 9 * 10) / 10;
};
/** "2026-06-09" o "2026-06-09 05:57:45" (GMT) → Date */
const parseDate = (x: unknown): Date | null => {
  const s = str(x);
  if (!s) return null;
  const iso = s.includes("T") ? s : s.replace(" ", "T");
  const withZ = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + "Z";
  const d = new Date(withZ);
  return isNaN(d.getTime()) ? null : d;
};
const dayOnly = (x: unknown): Date | null => {
  const s = str(x);
  if (!s) return null;
  const d = new Date(s.slice(0, 10) + "T00:00:00Z");
  return isNaN(d.getTime()) ? null : d;
};

/** Ingerisce le tabelle Garmin per un utente. Idempotente (upsert per data/attività). */
export async function ingestGarminTables(
  userId: string,
  tables: GarminTables,
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    dailyMetrics: 0,
    sleepRecords: 0,
    activities: 0,
    streams: 0,
    environments: 0,
  };

  // ── DailyMetric: fonde più tabelle giornaliere per data ──────────
  const daily = new Map<string, Record<string, unknown>>();
  const bucket = (dateStr: string) => {
    if (!daily.has(dateStr)) daily.set(dateStr, {});
    return daily.get(dateStr)!;
  };
  for (const r of tables.daily_summary ?? []) {
    const d = str(r.calendar_date);
    if (!d) continue;
    Object.assign(bucket(d), {
      restingHr: posInt(r.resting_heart_rate),
      stressAvg: posInt(r.average_stress_level),
      bodyBatteryHigh: posInt(r.body_battery_highest),
      bodyBatteryLow: posInt(r.body_battery_lowest),
    });
  }
  for (const r of tables.hrv ?? []) {
    const d = str(r.calendar_date);
    if (!d) continue;
    Object.assign(bucket(d), {
      hrv: num(r.last_night_avg) ?? num(r.weekly_avg),
      hrvStatus: str(r.status),
    });
  }
  for (const r of tables.training_status ?? []) {
    const d = str(r.calendar_date);
    if (!d) continue;
    Object.assign(bucket(d), {
      trainingLoadAcute: num(r.acute_load),
      trainingLoadChronic: num(r.chronic_load),
      trainingStatus: str(r.status),
    });
  }
  for (const r of tables.hydration ?? []) {
    const d = str(r.calendar_date);
    if (!d) continue;
    Object.assign(bucket(d), { hydrationMl: int(r.intake_ml) });
  }
  for (const r of tables.vo2max ?? []) {
    const d = str(r.calendar_date);
    if (!d) continue;
    const sport = (str(r.sport) ?? "").toLowerCase();
    const key = sport.includes("cycl") ? "vo2maxCycling" : "vo2maxRunning";
    Object.assign(bucket(d), { [key]: num(r.value) });
  }
  // readiness → stash nel raw (nessun campo dedicato)
  const readinessByDate = new Map<string, unknown>();
  for (const r of tables.training_readiness ?? []) {
    const d = str(r.calendar_date);
    if (d) readinessByDate.set(d, { score: num(r.score), level: str(r.level), recoveryTimeMin: num(r.recovery_time) });
  }

  for (const [dateStr, vals] of daily) {
    const date = dayOnly(dateStr);
    if (!date) continue;
    const data = {
      source: "garmin",
      restingHr: (vals.restingHr as number) ?? null,
      hrv: (vals.hrv as number) ?? null,
      hrvStatus: (vals.hrvStatus as string) ?? null,
      bodyBatteryHigh: (vals.bodyBatteryHigh as number) ?? null,
      bodyBatteryLow: (vals.bodyBatteryLow as number) ?? null,
      stressAvg: (vals.stressAvg as number) ?? null,
      vo2maxRunning: (vals.vo2maxRunning as number) ?? null,
      vo2maxCycling: (vals.vo2maxCycling as number) ?? null,
      trainingLoadAcute: (vals.trainingLoadAcute as number) ?? null,
      trainingLoadChronic: (vals.trainingLoadChronic as number) ?? null,
      trainingStatus: (vals.trainingStatus as string) ?? null,
      hydrationMl: (vals.hydrationMl as number) ?? null,
      raw: (readinessByDate.get(dateStr) ?? undefined) as object | undefined,
    };
    await db.dailyMetric.upsert({
      where: { userId_date: { userId, date } },
      update: data,
      create: { userId, date, ...data },
    });
    summary.dailyMetrics++;
  }

  // ── SleepRecord ──────────────────────────────────────────────────
  for (const r of tables.sleep ?? []) {
    const date = dayOnly(r.calendar_date);
    if (!date) continue;
    const durationSec = int(r.sleep_time_seconds);
    const awakeSec = int(r.awake_sleep_seconds);
    const efficiency =
      durationSec && awakeSec !== null
        ? Math.round((durationSec / (durationSec + awakeSec)) * 100) / 100
        : null;
    const data = {
      source: "garmin",
      durationSec,
      deepSec: int(r.deep_sleep_seconds),
      lightSec: int(r.light_sleep_seconds),
      remSec: int(r.rem_sleep_seconds),
      awakeSec,
      efficiency,
      score: int(r.sleep_score_overall),
      spo2Avg: int(r.average_spo2),
      spo2Min: int(r.lowest_spo2),
      respirationAvg: num(r.average_respiration),
      hrvOvernight: num(r.avg_overnight_hrv),
    };
    await db.sleepRecord.upsert({
      where: { userId_date: { userId, date } },
      update: data,
      create: { userId, date, ...data },
    });
    summary.sleepRecords++;
  }

  // ── Attività + stream + ambiente ─────────────────────────────────
  const splitsByAct = new Map<string, Row[]>();
  for (const s of tables.activity_splits ?? []) {
    const id = str(s.activity_id);
    if (!id) continue;
    if (!splitsByAct.has(id)) splitsByAct.set(id, []);
    splitsByAct.get(id)!.push(s);
  }
  const dynByAct = new Map<string, Row>();
  for (const d of tables.running_dynamics ?? []) {
    const id = str(d.activity_id);
    if (id) dynByAct.set(id, d);
  }
  const weatherByAct = new Map<string, Row>();
  for (const w of tables.activity_weather ?? []) {
    const id = str(w.activity_id);
    if (id) weatherByAct.set(id, w);
  }

  for (const a of tables.activity ?? []) {
    const externalId = str(a.activity_id);
    const date = parseDate(a.start_time_gmt);
    if (!externalId || !date) continue;

    const distanceM = num(a.distance_meters);
    const durationSec = int(a.duration_seconds);
    const distanceKm = distanceM !== null ? distanceM / 1000 : null;
    const avgPaceSecPerKm =
      distanceKm && durationSec ? Math.round(durationSec / distanceKm) : null;

    // upsert Activity per (userId, source, externalId)
    const existing = await db.activity.findFirst({
      where: { userId, source: "GARMIN", externalId },
      select: { id: true },
    });
    const actData = {
      type: null as string | null, // intensità non deducibile dal summary
      date,
      distanceKm: distanceKm ?? undefined,
      durationSec: durationSec ?? undefined,
      avgPaceSecPerKm: avgPaceSecPerKm ?? undefined,
      avgHr: int(a.average_hr) ?? undefined,
      maxHr: int(a.max_hr) ?? undefined,
      elevationGainM: int(a.elevation_gain) ?? undefined,
      cadence: int(a.avg_cadence) ?? undefined,
      notes: str(a.activity_name) ?? undefined,
    };
    let activityId: string;
    if (existing) {
      await db.activity.update({ where: { id: existing.id }, data: actData });
      activityId = existing.id;
    } else {
      const created = await db.activity.create({
        data: { userId, source: "GARMIN", externalId, ...actData },
        select: { id: true },
      });
      activityId = created.id;
    }
    summary.activities++;

    // ActivityStream (split come samples + dynamics)
    const splits = splitsByAct.get(externalId) ?? [];
    const samples = splits.map((s) => ({
      split: int(s.split_number),
      distanceM: num(s.distance_meters),
      durationSec: num(s.duration_seconds),
      paceSecPerKm:
        num(s.distance_meters) && num(s.duration_seconds)
          ? Math.round((num(s.duration_seconds)! / (num(s.distance_meters)! / 1000)))
          : null,
      hr: int(s.average_hr),
      maxHr: int(s.max_hr),
      cadence: int(s.avg_cadence),
      elevGain: num(s.elevation_gain),
      powerW: int(s.normalized_power),
    }));
    const dyn = dynByAct.get(externalId);
    const strideCm = dyn ? num(dyn.avg_stride_len) : null;
    const streamData = {
      userId,
      samples: samples.length ? samples : undefined,
      avgPowerW: int(a.avg_power),
      avgGctMs: dyn ? int(dyn.avg_gct) : null,
      avgVertOscCm: dyn ? num(dyn.avg_vert_osc) : null,
      avgStrideLenM: strideCm !== null ? Math.round((strideCm / 100) * 100) / 100 : null,
      sampleCount: samples.length || null,
    };
    await db.activityStream.upsert({
      where: { activityId },
      update: streamData,
      create: { activityId, ...streamData },
    });
    summary.streams++;

    // EnvironmentSnapshot (meteo per attività; °F → °C)
    const w = weatherByAct.get(externalId);
    if (w) {
      const envData = {
        userId,
        source: "garmin",
        tempC: fToC(w.temperature),
        dewPointC: fToC(w.dew_point),
        humidityPct: int(w.humidity),
        windKph:
          num(w.wind_speed) !== null
            ? Math.round(num(w.wind_speed)! * 1.60934 * 10) / 10 // mph → kph (approx)
            : null,
        windDir: str(w.wind_direction),
        conditions: str(w.weather_type),
        capturedAt: date,
      };
      await db.environmentSnapshot.upsert({
        where: { activityId },
        update: envData,
        create: { activityId, ...envData },
      });
      summary.environments++;
    }
  }

  return summary;
}
