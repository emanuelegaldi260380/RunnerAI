import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// MODULO 2 — Gemello Fisiologico.
// Deriva il profilo "del tuo motore" dai dati reali già ingeriti:
//  - zone HR reali da soglia stimata (LT2), non da %FCmax teorica
//  - decoupling HR/passo sui lunghi (resistenza aerobica)
//  - durability / fade del passo (tenuta in profondità di fatica)
//  - curva di risposta al caldo (efficienza vs dew point)
//  - VO2max (dal recupero Garmin)
// Tutto deterministico; la narrazione è una sintesi rule-based.
// ---------------------------------------------------------------------------

interface Split {
  split?: number | null;
  distanceM?: number | null;
  durationSec?: number | null;
  paceSecPerKm?: number | null;
  hr?: number | null;
}

const median = (xs: number[]): number | null => {
  const a = xs.filter((x) => Number.isFinite(x)).sort((p, q) => p - q);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const mean = (xs: number[]): number | null =>
  xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;

/** Regressione lineare semplice: ritorna la pendenza (slope) di y su x. */
function slope(points: { x: number; y: number }[]): number | null {
  const n = points.length;
  if (n < 3) return null;
  const mx = mean(points.map((p) => p.x))!;
  const my = mean(points.map((p) => p.y))!;
  let num = 0,
    den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

/** EF (efficiency factor) di uno split: velocità (m/s) / HR. */
function splitEF(s: Split): number | null {
  const hr = s.hr ?? null;
  const pace = s.paceSecPerKm ?? null;
  if (!hr || hr <= 0 || !pace || pace <= 0) return null;
  const speed = 1000 / pace; // m/s
  return speed / hr;
}

const LONG_RUN_MIN_SEC = 3300; // ~55 min
const LT_MIN_SEC = 1200; // 20 min: soglia minima per stima LT

export interface PhysioResult {
  activitiesUsed: number;
  maxHr: number | null;
  restingHr: number | null;
  lthr: number | null;
  thresholdPaceSecPerKm: number | null;
  hrZones: Record<string, { min: number; max: number }> | null;
  decouplingPct: number | null;
  durabilityPct: number | null;
  vo2max: number | null;
  heatSlopePctPerDewC: number | null;
  summary: string;
}

/** Calcola il profilo fisiologico e lo salva (upsert). */
export async function computePhysiologyProfile(userId: string): Promise<PhysioResult> {
  const [activities, daily] = await Promise.all([
    db.activity.findMany({
      where: { userId },
      include: { stream: true, environment: true },
      orderBy: { date: "asc" },
    }),
    db.dailyMetric.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      select: { restingHr: true, vo2maxRunning: true },
    }),
  ]);

  const runs = activities.filter((a) => (a.durationSec ?? 0) > 0 && (a.avgHr ?? 0) > 0);

  // maxHr: max osservato (attività) — proxy della FCmax reale
  const maxHr = runs.length ? Math.max(...runs.map((a) => a.maxHr ?? 0).filter((x) => x > 0)) || null : null;

  // restingHr: mediana dei giorni
  const restingHr = (() => {
    const m = median(daily.map((d) => d.restingHr ?? NaN).filter((x) => Number.isFinite(x)));
    return m === null ? null : Math.round(m);
  })();

  // LTHR stimata: HR del più duro sforzo CONTINUO (>=20 min). Proxy MVP.
  let lthr: number | null = null;
  let thresholdPaceSecPerKm: number | null = null;
  const sustained = runs.filter((a) => (a.durationSec ?? 0) >= LT_MIN_SEC);
  if (sustained.length) {
    const hardest = sustained.reduce((best, a) => ((a.avgHr ?? 0) > (best.avgHr ?? 0) ? a : best));
    lthr = hardest.avgHr ?? null;
    if (lthr && maxHr && lthr > maxHr * 0.97) lthr = Math.round(maxHr * 0.97); // cap prudente
    thresholdPaceSecPerKm = hardest.avgPaceSecPerKm ?? null;
  }

  // Zone HR reali dalla soglia (Friel, % di LTHR)
  const hrZones =
    lthr && maxHr
      ? {
          z1: { min: 0, max: Math.round(lthr * 0.85) - 1 },
          z2: { min: Math.round(lthr * 0.85), max: Math.round(lthr * 0.89) },
          z3: { min: Math.round(lthr * 0.9), max: Math.round(lthr * 0.94) },
          z4: { min: Math.round(lthr * 0.95), max: Math.round(lthr * 0.99) },
          z5: { min: Math.round(lthr), max: maxHr },
        }
      : null;

  // Lunghi: per decoupling e durability
  const longRuns = runs.filter((a) => (a.durationSec ?? 0) >= LONG_RUN_MIN_SEC && a.stream?.samples);
  const decouplingVals: number[] = [];
  const durabilityVals: number[] = [];
  for (const a of longRuns) {
    const splits = (a.stream!.samples as unknown as Split[]) ?? [];
    const valid = splits.filter((s) => splitEF(s) !== null && (s.paceSecPerKm ?? 0) > 0);
    if (valid.length < 4) continue;
    const half = Math.floor(valid.length / 2);
    // decoupling: EF prima metà vs seconda metà
    const ef1 = mean(valid.slice(0, half).map((s) => splitEF(s)!));
    const ef2 = mean(valid.slice(half).map((s) => splitEF(s)!));
    if (ef1 && ef2) decouplingVals.push(((ef1 - ef2) / ef1) * 100);
    // durability: fade del passo, ultimo terzo vs primo terzo
    const third = Math.max(1, Math.floor(valid.length / 3));
    const p1 = mean(valid.slice(0, third).map((s) => s.paceSecPerKm!));
    const p3 = mean(valid.slice(-third).map((s) => s.paceSecPerKm!));
    if (p1 && p3) durabilityVals.push(((p3 - p1) / p1) * 100);
  }
  const round1 = (x: number | null) => (x === null ? null : Math.round(x * 10) / 10);
  const decouplingPct = round1(mean(decouplingVals));
  const durabilityPct = round1(mean(durabilityVals));

  // VO2max: ultimo valore disponibile
  const vo2max = daily.find((d) => (d.vo2maxRunning ?? 0) > 0)?.vo2maxRunning ?? null;

  // Curva caldo: EF vs dew point (serve varietà di dew point)
  const heatPoints = runs
    .filter((a) => a.environment?.dewPointC != null && (a.avgHr ?? 0) > 0 && (a.avgPaceSecPerKm ?? 0) > 0)
    .map((a) => ({ x: a.environment!.dewPointC as number, y: (1000 / a.avgPaceSecPerKm!) / a.avgHr! }));
  let heatSlopePctPerDewC: number | null = null;
  const dewSpread = heatPoints.length
    ? Math.max(...heatPoints.map((p) => p.x)) - Math.min(...heatPoints.map((p) => p.x))
    : 0;
  if (heatPoints.length >= 6 && dewSpread >= 3) {
    const s = slope(heatPoints);
    const meanEF = mean(heatPoints.map((p) => p.y));
    if (s !== null && meanEF) heatSlopePctPerDewC = round1((s / meanEF) * 100);
  }

  // Sintesi rule-based
  const summary = buildSummary({
    activitiesUsed: runs.length,
    lthr,
    maxHr,
    restingHr,
    decouplingPct,
    durabilityPct,
    heatSlopePctPerDewC,
    vo2max,
  });

  const result: PhysioResult = {
    activitiesUsed: runs.length,
    maxHr,
    restingHr,
    lthr,
    thresholdPaceSecPerKm,
    hrZones,
    decouplingPct,
    durabilityPct,
    vo2max,
    heatSlopePctPerDewC,
    summary,
  };

  // Prisma: i campi Json? non accettano `null` letterale → usa undefined.
  const { hrZones: hz, ...rest } = result;
  const data = { ...rest, hrZones: hz ?? undefined };
  await db.physiologyProfile.upsert({
    where: { userId },
    update: { ...data, computedAt: new Date() },
    create: { userId, ...data },
  });

  return result;
}

function buildSummary(p: {
  activitiesUsed: number;
  lthr: number | null;
  maxHr: number | null;
  restingHr: number | null;
  decouplingPct: number | null;
  durabilityPct: number | null;
  heatSlopePctPerDewC: number | null;
  vo2max: number | null;
}): string {
  const parts: string[] = [];
  if (p.lthr) parts.push(`Soglia stimata ~${p.lthr} bpm${p.maxHr ? ` (FCmax osservata ${p.maxHr})` : ""}.`);
  if (p.restingHr) parts.push(`FC a riposo ~${p.restingHr} bpm.`);
  if (p.vo2max) parts.push(`VO₂max ~${p.vo2max}.`);
  if (p.decouplingPct != null) {
    const q = p.decouplingPct < 5 ? "ottima" : p.decouplingPct < 8 ? "buona" : "da migliorare";
    parts.push(`Decoupling medio sui lunghi ${p.decouplingPct}% (resistenza aerobica ${q}).`);
  }
  if (p.durabilityPct != null) {
    const q = p.durabilityPct < 3 ? "tieni molto bene il passo in fatica" : p.durabilityPct < 6 ? "buona tenuta" : "il passo tende a calare a fine lungo";
    parts.push(`Fade del passo ${p.durabilityPct}%: ${q}.`);
  }
  if (p.heatSlopePctPerDewC != null) {
    parts.push(
      `Caldo: perdi circa ${Math.abs(p.heatSlopePctPerDewC)}% di efficienza per ogni °C di dew point in più.`,
    );
  }
  if (!parts.length) return "Dati insufficienti: servono più attività (idealmente lunghi con HR e stream).";
  return parts.join(" ") + ` Basato su ${p.activitiesUsed} attività.`;
}
