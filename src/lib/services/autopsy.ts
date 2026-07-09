import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getUserTextProvider } from "@/lib/llm/userProvider";
import { fmtDuration, fmtPace } from "@/lib/format";
import { autopsyMetrics, executionScoreFromMetrics } from "./autopsyMath";
import type { Split } from "./physiologyMath";

// ---------------------------------------------------------------------------
// Modulo 1 — Autopsia post-performance.
// Analisi approfondita di una gara o seduta chiave: metriche oggettive dagli
// split (positive split, cedimento finale, drift cardiaco, regolarità del passo)
// + lettura tecnica dell'AI su esecuzione, punti di cedimento e lezioni.
// ---------------------------------------------------------------------------

const LANG_NAME: Record<string, string> = {
  it: "italiano",
  en: "inglese",
  es: "spagnolo",
};

export interface AutopsyResult {
  headline: string;
  summary: string;
  pacingAnalysis: string;
  lessons: string[];
  executionScore: number | null;
  positiveSplitPct: number | null;
  fadePct: number | null;
  hrDriftPct: number | null;
  paceCvPct: number | null;
}

/** Normalizza gli split di un'attività (o i sample dello stream) in Split[]. */
export function normalizeSplits(
  splits: unknown,
  streamSamples: unknown,
): Split[] {
  const fromSplits = toSplitArray(splits);
  if (fromSplits.length >= 4) return fromSplits;
  // fallback: campiona lo stream ~1Hz riducendolo a segmenti gestibili
  const stream = toSplitArray(streamSamples);
  return stream.length >= 4 ? downsample(stream, 20) : fromSplits;
}

function toSplitArray(raw: unknown): Split[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r): Split | null => {
      if (!r || typeof r !== "object") return null;
      const o = r as Record<string, unknown>;
      const pace =
        num(o.paceSecPerKm) ?? num(o.paceSec) ?? num(o.pace) ?? null;
      const hr = num(o.hr) ?? num(o.avgHr) ?? null;
      if (pace == null && hr == null) return null;
      return { paceSecPerKm: pace, hr };
    })
    .filter((s): s is Split => s !== null);
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Riduce una serie lunga a ~n segmenti mediando a blocchi (mantiene la forma). */
function downsample(arr: Split[], n: number): Split[] {
  if (arr.length <= n) return arr;
  const size = Math.ceil(arr.length / n);
  const out: Split[] = [];
  for (let i = 0; i < arr.length; i += size) {
    const chunk = arr.slice(i, i + size);
    const paces = chunk.map((s) => s.paceSecPerKm).filter((p): p is number => !!p);
    const hrs = chunk.map((s) => s.hr).filter((h): h is number => !!h);
    out.push({
      paceSecPerKm: paces.length ? paces.reduce((a, b) => a + b, 0) / paces.length : null,
      hr: hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : null,
    });
  }
  return out;
}

/**
 * Genera (o rigenera) l'autopsia di un'attività e la persiste. Rispetta la
 * scelta BYOK dell'utente. Ritorna null se l'attività non esiste o mancano dati.
 */
export async function generateAutopsy(
  userId: string,
  activityId: string,
  lang = "it",
): Promise<AutopsyResult | null> {
  const activity = await db.activity.findFirst({
    where: { id: activityId, userId },
    include: { stream: true, plannedWorkout: true },
  });
  if (!activity) return null;

  const splits = normalizeSplits(activity.splits, activity.stream?.samples);
  const metrics = autopsyMetrics(splits);
  const heuristicScore = executionScoreFromMetrics(metrics);

  const prov = await getUserTextProvider(userId);

  // Contesto per l'AI: dati sintetici + metriche calcolate + eventuale gara.
  const goal = await db.raceGoal.findFirst({
    where: { userId },
    orderBy: { raceDate: "asc" },
  });

  const summaryData = {
    tipo: activity.type,
    data: activity.date.toISOString().slice(0, 10),
    distanceKm: activity.distanceKm,
    durata: fmtDuration(activity.durationSec),
    passoMedio: fmtPace(activity.avgPaceSecPerKm),
    fcMedia: activity.avgHr,
    fcMax: activity.maxHr,
    dislivelloM: activity.elevationGainM,
    pianificato: activity.plannedWorkout
      ? { titolo: activity.plannedWorkout.title, tipo: activity.plannedWorkout.type }
      : null,
    gara: goal ? { nome: goal.name, distanceKm: goal.distanceKm } : null,
  };
  const metricsData = {
    positiveSplitPct: metrics.positiveSplitPct,
    cedimentoFinalePct: metrics.fadePct,
    driftCardiacoPct: metrics.hrDriftPct,
    regolaritaPassoCvPct: metrics.paceCvPct,
    splitAnalizzati: metrics.usableSplits,
    punteggioEsecuzioneEuristico: heuristicScore,
  };

  let ai: {
    headline?: string;
    summary?: string;
    pacingAnalysis?: string;
    lessons?: string[];
    executionScore?: number;
  } | null = null;

  if (prov) {
    const langName = LANG_NAME[lang] ?? lang;
    const sys =
      "Sei un coach di corsa d'élite che esegue l'autopsia tecnica di una prova (gara o seduta chiave). " +
      "Interpreti i dati oggettivi già calcolati (non ricalcolarli), individui dove e perché la prestazione ha tenuto o ceduto, " +
      "e ricavi lezioni operative per i prossimi blocchi. Concreto, tecnico, onesto. Rispondi SOLO con JSON valido.";
    const user =
      `Prova svolta:\n${JSON.stringify(summaryData)}\n\n` +
      `Metriche oggettive già calcolate (usale come base, non inventarne di nuove):\n${JSON.stringify(metricsData)}\n\n` +
      `Nota: positiveSplitPct>0 = seconda metà più lenta; cedimentoFinalePct>0 = rallenta nel finale; ` +
      `driftCardiacoPct alto = base aerobica sotto stress; regolaritaPassoCvPct basso = pacing uniforme.\n\n` +
      `Scrivi TUTTI i testi in ${langName}. Rispondi con JSON:\n` +
      `{ "headline": "verdetto in una frase", ` +
      `"summary": "3-5 frasi: com'è andata la prova nel complesso rispetto a piano/obiettivo", ` +
      `"pacingAnalysis": "2-4 frasi: lettura del pacing e della distribuzione dello sforzo", ` +
      `"lessons": ["2-4 lezioni operative brevi per i prossimi allenamenti"], ` +
      `"executionScore": numero 0-100 (qualità di esecuzione complessiva) }`;
    try {
      ai = await prov.chatJSON({
        system: sys,
        messages: [{ role: "user", content: user }],
        maxTokens: 900,
      });
    } catch {
      ai = null;
    }
  }

  const result: AutopsyResult = {
    headline: String(ai?.headline ?? "").slice(0, 240) || fallbackHeadline(metrics.positiveSplitPct),
    summary: String(ai?.summary ?? "").slice(0, 1600),
    pacingAnalysis: String(ai?.pacingAnalysis ?? "").slice(0, 1000),
    lessons: Array.isArray(ai?.lessons)
      ? ai!.lessons.map((l) => String(l).slice(0, 240)).slice(0, 6)
      : [],
    executionScore:
      typeof ai?.executionScore === "number"
        ? Math.max(0, Math.min(100, Math.round(ai.executionScore)))
        : heuristicScore,
    positiveSplitPct: metrics.positiveSplitPct,
    fadePct: metrics.fadePct,
    hrDriftPct: metrics.hrDriftPct,
    paceCvPct: metrics.paceCvPct,
  };

  const lessonsJson = (result.lessons as unknown as Prisma.InputJsonValue) ?? undefined;
  const metricsJson: Prisma.InputJsonValue = {
    ...metricsData,
  };
  await db.performanceAutopsy.upsert({
    where: { activityId },
    create: {
      userId,
      activityId,
      headline: result.headline,
      summary: result.summary || null,
      pacingAnalysis: result.pacingAnalysis || null,
      lessons: lessonsJson,
      executionScore: result.executionScore,
      positiveSplitPct: result.positiveSplitPct,
      fadePct: result.fadePct,
      hrDriftPct: result.hrDriftPct,
      paceCvPct: result.paceCvPct,
      metrics: metricsJson,
      lang,
    },
    update: {
      headline: result.headline,
      summary: result.summary || null,
      pacingAnalysis: result.pacingAnalysis || null,
      lessons: lessonsJson,
      executionScore: result.executionScore,
      positiveSplitPct: result.positiveSplitPct,
      fadePct: result.fadePct,
      hrDriftPct: result.hrDriftPct,
      paceCvPct: result.paceCvPct,
      metrics: metricsJson,
      lang,
      updatedAt: new Date(),
    },
  });

  return result;
}

function fallbackHeadline(positiveSplitPct: number | null): string {
  if (positiveSplitPct == null) return "Autopsia della prova";
  if (positiveSplitPct <= -1) return "Chiusura in progressione (negative split)";
  if (positiveSplitPct <= 2) return "Prova ben distribuita";
  if (positiveSplitPct <= 6) return "La prova ha perso ritmo nella seconda metà";
  return "Forte calo nella seconda metà: gestione dello sforzo da rivedere";
}
