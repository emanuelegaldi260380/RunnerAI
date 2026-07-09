import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  median,
  linRegSlope,
  decoupling,
  paceDegradation,
  zonesFromLthr,
  round1,
  type Split,
  type HrZones,
} from "./physiologyMath";

export { zonesFromLthr };
export type { HrZones };

// ---------------------------------------------------------------------------
// Modulo 2 — Gemello Fisiologico.
// Deriva un profilo fisiologico dai DATI REALI dell'atleta (attività, stream a
// split, metriche giornaliere, sonno, ambiente). Non è inserito dall'utente:
// viene ricalcolato (es. dopo un deep-sync Garmin) e usato per calibrare i piani.
//
// Metriche stimate:
//  - LT2: FC di soglia (LTHR) e passo di soglia dagli sforzi sostenuti reali
//  - Zone FC personali calcolate sulla LTHR (modello Friel per la corsa)
//  - Decoupling aerobico (Pa:Hr drift) sugli sforzi steady
//  - Durabilità (degrado del passo nella parte finale dei lunghi)
//  - Sensibilità al caldo (sec/km per °C di dew point)
//  - HRV di baseline, FC riposo, VO2max
// ---------------------------------------------------------------------------

export interface PhysiologyResult {
  lthrBpm: number | null;
  thresholdPaceSecPerKm: number | null;
  maxHrEst: number | null;
  restingHrEst: number | null;
  vo2max: number | null;
  hrZones: HrZones | null;
  decouplingPct: number | null;
  durabilityPct: number | null;
  heatSecPerKmPerC: number | null;
  baselineHrvMs: number | null;
  sampleActivities: number;
  confidence: "low" | "medium" | "high";
  notes: string;
}

const STEADY = new Set(["easy", "long", "tempo", "recovery"]);
const HARD = new Set(["tempo", "interval", "race"]);

/** Calcola e persiste il gemello fisiologico dai dati reali dell'utente. */
export async function computePhysiologyProfile(
  userId: string,
): Promise<PhysiologyResult> {
  const since = new Date(Date.now() - 120 * 86400_000); // ultimi ~120 giorni
  const [profile, activities, dailies, sleeps] = await Promise.all([
    db.athleteProfile.findUnique({ where: { userId } }),
    db.activity.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: "desc" },
      take: 80,
      include: { stream: true, environment: true },
    }),
    db.dailyMetric.findMany({
      where: { userId, date: { gte: since } },
      select: { restingHr: true, hrv: true, vo2maxRunning: true, date: true },
      orderBy: { date: "desc" },
    }),
    db.sleepRecord.findMany({
      where: { userId, date: { gte: since }, hrvOvernight: { not: null } },
      select: { hrvOvernight: true },
    }),
  ]);

  // FC max: massimo osservato + dichiarato
  const maxHrEst =
    Math.max(
      profile?.maxHr ?? 0,
      ...activities.map((a) => a.maxHr ?? 0),
    ) || null;

  // FC riposo: mediana metriche giornaliere (fallback profilo)
  const restingHrEst =
    median(dailies.map((d) => d.restingHr ?? NaN).filter(Number.isFinite)) ??
    profile?.restingHr ??
    null;

  // VO2max: ultimo valore disponibile
  const vo2max =
    dailies.find((d) => d.vo2maxRunning != null)?.vo2maxRunning ?? null;

  // HRV di baseline: mediana giornaliera (fallback notturna dal sonno)
  const baselineHrvMs =
    median(dailies.map((d) => d.hrv ?? NaN).filter(Number.isFinite)) ??
    median(sleeps.map((s) => s.hrvOvernight ?? NaN).filter(Number.isFinite)) ??
    null;

  // LTHR e passo di soglia dagli sforzi sostenuti (>= 20 min)
  const hardEfforts = activities.filter(
    (a) => a.type && HARD.has(a.type) && (a.durationSec ?? 0) >= 20 * 60,
  );
  let lthrBpm: number | null = null;
  const hardHrs = hardEfforts.map((a) => a.avgHr ?? 0).filter((h) => h > 0);
  if (hardHrs.length) {
    lthrBpm = Math.max(...hardHrs);
    if (maxHrEst) lthrBpm = Math.min(lthrBpm, Math.round(maxHrEst * 0.97));
  } else if (maxHrEst) {
    lthrBpm = Math.round(maxHrEst * 0.9); // stima conservativa
  }
  const thresholdPaceSecPerKm =
    hardEfforts
      .filter((a) => (a.type === "tempo" || a.type === "race") && a.avgPaceSecPerKm)
      .map((a) => a.avgPaceSecPerKm!)
      .sort((a, b) => a - b)[0] ?? null;

  const hrZones =
    lthrBpm && maxHrEst ? zonesFromLthr(lthrBpm, maxHrEst) : null;

  // Decoupling: sforzi steady abbastanza lunghi con stream a split
  const decouplings: number[] = [];
  const degradations: number[] = [];
  for (const a of activities) {
    const samples = (a.stream?.samples as Split[] | null) ?? null;
    if (!samples || samples.length < 4) continue;
    if (a.type && STEADY.has(a.type) && (a.durationSec ?? 0) >= 40 * 60) {
      const d = decoupling(samples);
      if (d != null) decouplings.push(d);
    }
    // Durabilità sui lunghi (>= 90 min o >= 18 km)
    if (
      a.type === "long" ||
      (a.durationSec ?? 0) >= 90 * 60 ||
      (a.distanceKm ?? 0) >= 18
    ) {
      const deg = paceDegradation(samples);
      if (deg != null) degradations.push(deg);
    }
  }
  const decouplingPct = median(decouplings);
  const durabilityPct = median(degradations);

  // Sensibilità al caldo: regressione passo vs dew point sulle sedute easy/steady
  const heatPts = activities
    .filter(
      (a) =>
        a.type &&
        STEADY.has(a.type) &&
        a.avgPaceSecPerKm &&
        a.environment?.dewPointC != null,
    )
    .map((a) => ({ x: a.environment!.dewPointC!, y: a.avgPaceSecPerKm! }));
  const heatSlope = linRegSlope(heatPts);
  // tieni solo pendenze positive plausibili (0–15 sec/km per °C)
  const heatSecPerKmPerC =
    heatSlope != null && heatSlope > 0 && heatSlope < 15
      ? Math.round(heatSlope * 10) / 10
      : null;

  // Affidabilità in base alla quantità/qualità di dati
  const withStream = activities.filter((a) => a.stream?.samples).length;
  const confidence: PhysiologyResult["confidence"] =
    activities.length >= 20 && withStream >= 6
      ? "high"
      : activities.length >= 8
        ? "medium"
        : "low";

  const notes = buildNotes({
    lthrBpm,
    thresholdPaceSecPerKm,
    decouplingPct,
    durabilityPct,
    heatSecPerKmPerC,
  });

  const result: PhysiologyResult = {
    lthrBpm,
    thresholdPaceSecPerKm,
    maxHrEst,
    restingHrEst,
    vo2max,
    hrZones,
    decouplingPct: round1(decouplingPct),
    durabilityPct: round1(durabilityPct),
    heatSecPerKmPerC,
    baselineHrvMs: round1(baselineHrvMs),
    sampleActivities: activities.length,
    confidence,
    notes,
  };

  const hrZonesJson = (hrZones ?? undefined) as
    | Prisma.InputJsonValue
    | undefined;
  const rawJson: Prisma.InputJsonValue = {
    decouplings,
    degradations,
    heatPoints: heatPts.length,
  };
  await db.physiologyProfile.upsert({
    where: { userId },
    create: {
      userId,
      ...result,
      hrZones: hrZonesJson,
      raw: rawJson,
    },
    update: {
      ...result,
      hrZones: hrZonesJson,
      raw: rawJson,
      computedAt: new Date(),
    },
  });

  return result;
}

function buildNotes(r: {
  lthrBpm: number | null;
  thresholdPaceSecPerKm: number | null;
  decouplingPct: number | null;
  durabilityPct: number | null;
  heatSecPerKmPerC: number | null;
}): string {
  const parts: string[] = [];
  if (r.lthrBpm) parts.push(`Soglia ~${r.lthrBpm} bpm`);
  if (r.decouplingPct != null)
    parts.push(
      r.decouplingPct <= 5
        ? "ottima resistenza aerobica (decoupling basso)"
        : r.decouplingPct <= 10
          ? "buona resistenza aerobica"
          : "drift cardiaco elevato: base aerobica da rinforzare",
    );
  if (r.durabilityPct != null)
    parts.push(
      r.durabilityPct <= 3
        ? "durabilità elevata sui lunghi"
        : "il passo cala nella parte finale dei lunghi",
    );
  if (r.heatSecPerKmPerC != null)
    parts.push(`sensibile al caldo (~${r.heatSecPerKmPerC}s/km per °C di dew point)`);
  return parts.join("; ") || "Dati insufficienti per un profilo affidabile.";
}

/**
 * Blocco testuale da iniettare nel prompt del motore-piano: dà al coach AI i
 * valori fisiologici reali su cui calibrare ritmi e zone.
 */
export function physiologyContextBlock(p: {
  lthrBpm: number | null;
  thresholdPaceSecPerKm: number | null;
  hrZones: unknown;
  decouplingPct: number | null;
  durabilityPct: number | null;
  heatSecPerKmPerC: number | null;
  vo2max: number | null;
  confidence: string | null;
}): string {
  const lines: string[] = ["GEMELLO FISIOLOGICO (derivato dai dati reali — calibra ritmi e zone su questi valori):"];
  if (p.lthrBpm) lines.push(`- FC di soglia (LT2): ${p.lthrBpm} bpm`);
  if (p.thresholdPaceSecPerKm)
    lines.push(
      `- Passo di soglia: ${paceStr(p.thresholdPaceSecPerKm)}/km (ancora i ritmi tempo/soglia qui)`,
    );
  if (p.vo2max) lines.push(`- VO2max stimato: ${p.vo2max}`);
  const z = p.hrZones as HrZones | null;
  if (z)
    lines.push(
      `- Zone FC reali: Z1 ${z.z1.min}-${z.z1.max}, Z2 ${z.z2.min}-${z.z2.max}, Z3 ${z.z3.min}-${z.z3.max}, Z4 ${z.z4.min}-${z.z4.max}, Z5 ${z.z5.min}-${z.z5.max} bpm`,
    );
  if (p.decouplingPct != null)
    lines.push(
      `- Decoupling aerobico: ${p.decouplingPct}% (${p.decouplingPct <= 5 ? "base solida" : p.decouplingPct <= 10 ? "discreta" : "base aerobica da rinforzare con più Z2"})`,
    );
  if (p.durabilityPct != null)
    lines.push(
      `- Durabilità sui lunghi: calo passo ${p.durabilityPct}% nel finale (${p.durabilityPct <= 3 ? "resistente alla fatica" : "lavora la resistenza specifica/durabilità"})`,
    );
  if (p.heatSecPerKmPerC != null)
    lines.push(
      `- Sensibilità al caldo: +${p.heatSecPerKmPerC}s/km per °C di dew point (adatta i target nelle giornate umide)`,
    );
  if (lines.length === 1) return ""; // nessun dato utile
  if (p.confidence) lines.push(`- Affidabilità del profilo: ${p.confidence}`);
  return lines.join("\n");
}

function paceStr(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
