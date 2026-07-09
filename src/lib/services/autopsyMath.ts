// ---------------------------------------------------------------------------
// Funzioni pure per l'autopsia post-performance (Modulo 1).
// Nessun import di DB: metriche oggettive calcolate dagli split di una prova,
// indipendenti dall'LLM. Riusano le primitive del gemello fisiologico.
// ---------------------------------------------------------------------------
import { decoupling, paceDegradation, type Split } from "./physiologyMath";

export { decoupling, paceDegradation };
export type { Split };

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Positive/negative split: passo medio 2ª metà vs 1ª metà (%).
 * > 0 = positive split (seconda metà più lenta, la prova "si spegne").
 * < 0 = negative split (chiusura in progressione, di norma segno di buona gestione).
 */
export function positiveSplitPct(splits: Split[]): number | null {
  const usable = splits.filter((s) => s.paceSecPerKm && s.paceSecPerKm > 0);
  if (usable.length < 4) return null;
  const half = Math.floor(usable.length / 2);
  const first = avg(usable.slice(0, half).map((s) => s.paceSecPerKm!));
  const second = avg(usable.slice(half).map((s) => s.paceSecPerKm!));
  if (!(first > 0)) return null;
  return ((second - first) / first) * 100;
}

/**
 * Coefficiente di variazione del passo (%): deviazione standard / media.
 * Misura la REGOLARITÀ del passo (più basso = pacing più uniforme).
 */
export function paceCvPct(splits: Split[]): number | null {
  const paces = splits
    .map((s) => s.paceSecPerKm)
    .filter((p): p is number => !!p && p > 0);
  if (paces.length < 4) return null;
  const m = avg(paces);
  if (!(m > 0)) return null;
  const variance = avg(paces.map((p) => (p - m) ** 2));
  return (Math.sqrt(variance) / m) * 100;
}

export interface AutopsyMetrics {
  positiveSplitPct: number | null;
  fadePct: number | null;
  hrDriftPct: number | null;
  paceCvPct: number | null;
  usableSplits: number;
}

/** Calcola tutte le metriche oggettive da una serie di split. */
export function autopsyMetrics(splits: Split[]): AutopsyMetrics {
  return {
    positiveSplitPct: round1(positiveSplitPct(splits)),
    fadePct: round1(paceDegradation(splits)),
    hrDriftPct: round1(decoupling(splits)),
    paceCvPct: round1(paceCvPct(splits)),
    usableSplits: splits.filter((s) => s.paceSecPerKm && s.paceSecPerKm > 0).length,
  };
}

/**
 * Punteggio di esecuzione euristico 0-100 dalle sole metriche oggettive
 * (regolarità del passo, tenuta nel finale, drift cardiaco). È una stima di
 * partenza: il giudizio tecnico fine lo dà l'AI.
 */
export function executionScoreFromMetrics(m: AutopsyMetrics): number | null {
  if (m.usableSplits < 4) return null;
  let score = 100;
  // penalità per positive split (rallentamento nella seconda metà)
  if (m.positiveSplitPct != null && m.positiveSplitPct > 0)
    score -= Math.min(30, m.positiveSplitPct * 3);
  // penalità per cedimento nel finale
  if (m.fadePct != null && m.fadePct > 0) score -= Math.min(25, m.fadePct * 2.5);
  // penalità per drift cardiaco elevato
  if (m.hrDriftPct != null && m.hrDriftPct > 5)
    score -= Math.min(20, (m.hrDriftPct - 5) * 2);
  // penalità per irregolarità del passo
  if (m.paceCvPct != null && m.paceCvPct > 4)
    score -= Math.min(15, (m.paceCvPct - 4) * 2);
  return Math.max(0, Math.round(score));
}

function round1(x: number | null): number | null {
  return x == null ? null : Math.round(x * 10) / 10;
}
