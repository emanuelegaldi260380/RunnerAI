// ---------------------------------------------------------------------------
// Funzioni pure per la mappatura soggettivo ↔ oggettivo (Modulo 4).
// Nessun import di DB: correlazione tra sensazioni riportate e dati reali.
// ---------------------------------------------------------------------------

export interface Pair {
  x: number;
  y: number;
}

// Soglia minima di abbinamenti per una correlazione. Con pochi punti (es. 5) una
// |r| alta è facilmente spuria: 8 riduce i falsi positivi prima di calibrare il
// piano o mostrare la relazione all'atleta.
export const MIN_PAIRS = 8;

/** Coefficiente di correlazione di Pearson. Null se <MIN_PAIRS coppie o varianza nulla. */
export function pearson(pairs: Pair[]): number | null {
  const pts = pairs.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const n = pts.length;
  if (n < MIN_PAIRS) return null;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const p of pts) {
    const dx = p.x - mx;
    const dy = p.y - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx < 1e-9 || syy < 1e-9) return null; // nessuna varianza
  return sxy / Math.sqrt(sxx * syy);
}

export type Strength = "strong" | "moderate" | "weak";

/** Classifica l'intensità di una correlazione. Null se troppo debole per contare. */
export function strength(r: number | null): Strength | null {
  if (r == null) return null;
  const a = Math.abs(r);
  if (a >= 0.5) return "strong";
  if (a >= 0.3) return "moderate";
  if (a >= 0.15) return "weak";
  return null;
}

export function round2(x: number | null): number | null {
  return x == null ? null : Math.round(x * 100) / 100;
}
