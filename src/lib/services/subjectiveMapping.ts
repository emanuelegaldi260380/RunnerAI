import { db } from "@/lib/db";
import { pearson, strength, round2, type Pair, type Strength } from "./subjectiveMath";

// ---------------------------------------------------------------------------
// Modulo 4 — Mappatura soggettivo ↔ oggettivo.
// Impara la relazione PERSONALE tra come l'atleta si sente (RPE, gambe, sonno,
// umore) e i suoi dati reali (HRV, FC riposo, passo nelle sedute steady).
// Non è persistita: si calcola al volo dai log. Alimenta la card e il prompt piano.
// ---------------------------------------------------------------------------

export type FactorKey = "rpe" | "legs" | "sleep" | "mood";
export type OutcomeKey = "hrv" | "hr" | "pace";

export interface SubjectiveInsight {
  factor: FactorKey;
  outcome: OutcomeKey;
  r: number; // correlazione (segno grezzo)
  n: number; // numero di abbinamenti
  effect: "better" | "worse"; // effetto sul rendimento quando il fattore è alto
  strength: Strength;
}

export interface SubjectiveMapping {
  insights: SubjectiveInsight[];
  sampleDays: number;
}

const STEADY = new Set(["easy", "long", "recovery"]);

// Direzione "buona" di ciascun outcome: +1 se più alto è meglio, -1 se peggio.
const OUTCOME_GOOD: Record<OutcomeKey, number> = {
  hrv: +1, // HRV più alta = meglio
  hr: -1, // FC a riposo più alta = peggio
  pace: -1, // passo (sec/km) più alto = più lento = peggio
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Calcola la mappatura soggettivo↔oggettivo dai dati reali dell'utente. */
export async function computeSubjectiveMapping(
  userId: string,
): Promise<SubjectiveMapping> {
  const since = new Date(Date.now() - 180 * 86400_000);
  const [logs, dailies, activities] = await Promise.all([
    db.subjectiveLog.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: "desc" },
      take: 200,
    }),
    db.dailyMetric.findMany({
      where: { userId, date: { gte: since } },
      select: { date: true, hrv: true, restingHr: true },
    }),
    db.activity.findMany({
      where: { userId, date: { gte: since } },
      select: { date: true, type: true, avgPaceSecPerKm: true },
      orderBy: { date: "desc" },
    }),
  ]);

  const dailyByDay = new Map(dailies.map((d) => [dayKey(d.date), d]));
  const steadyPaceByDay = new Map<string, number>();
  for (const a of activities) {
    if (a.type && STEADY.has(a.type) && a.avgPaceSecPerKm) {
      const k = dayKey(a.date);
      if (!steadyPaceByDay.has(k)) steadyPaceByDay.set(k, a.avgPaceSecPerKm);
    }
  }

  const factors: { key: FactorKey; get: (l: (typeof logs)[number]) => number | null }[] = [
    { key: "rpe", get: (l) => l.rpe },
    { key: "legs", get: (l) => l.legs },
    { key: "sleep", get: (l) => l.sleepPerceived },
    { key: "mood", get: (l) => l.mood },
  ];
  const outcomes: { key: OutcomeKey; get: (day: string) => number | null }[] = [
    { key: "hrv", get: (d) => dailyByDay.get(d)?.hrv ?? null },
    { key: "hr", get: (d) => dailyByDay.get(d)?.restingHr ?? null },
    { key: "pace", get: (d) => steadyPaceByDay.get(d) ?? null },
  ];

  const usedDays = new Set<string>();
  const insights: SubjectiveInsight[] = [];

  for (const f of factors) {
    for (const o of outcomes) {
      const pairs: Pair[] = [];
      for (const log of logs) {
        const x = f.get(log);
        if (x == null) continue;
        const day = dayKey(log.date);
        const y = o.get(day);
        if (y == null) continue;
        pairs.push({ x, y });
        usedDays.add(day);
      }
      const r = pearson(pairs);
      const s = strength(r);
      if (r == null || s == null) continue;
      // effetto sul rendimento quando il fattore è alto:
      // sign(r) * direzione-buona-dell'outcome > 0 → migliora
      const improves = Math.sign(r) * OUTCOME_GOOD[o.key] > 0;
      insights.push({
        factor: f.key,
        outcome: o.key,
        r: round2(r)!,
        n: pairs.length,
        effect: improves ? "better" : "worse",
        strength: s,
      });
    }
  }

  // ordina per intensità (|r|) decrescente e tieni i più informativi
  insights.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  return { insights: insights.slice(0, 6), sampleDays: usedDays.size };
}

// Etichette per il blocco testuale del prompt piano (interno, in italiano).
const F_IT: Record<FactorKey, string> = {
  rpe: "lo sforzo percepito è alto",
  legs: "le gambe sono brillanti",
  sleep: "il sonno percepito è buono",
  mood: "l'umore è alto",
};
const O_IT: Record<OutcomeKey, string> = {
  hrv: "l'HRV",
  hr: "la FC a riposo",
  pace: "il passo nelle sedute lente",
};

/**
 * Blocco testuale da iniettare nel prompt del motore-piano: dà al coach AI la
 * relazione personale sensazioni↔performance appresa dai log dell'atleta.
 */
export function subjectiveContextBlock(m: SubjectiveMapping): string {
  const strong = m.insights.filter((i) => i.strength !== "weak");
  if (strong.length === 0) return "";
  const lines = [
    "MAPPATURA SOGGETTIVO↔OGGETTIVO (relazioni personali apprese dai log — usale per adattare il carico ai segnali dell'atleta):",
    ...strong.map(
      (i) =>
        `- Quando ${F_IT[i.factor]}, ${O_IT[i.outcome]} tende a ${i.effect === "better" ? "migliorare" : "peggiorare"} (correlazione ${i.strength === "strong" ? "forte" : "moderata"}, n=${i.n}).`,
    ),
  ];
  return lines.join("\n");
}
