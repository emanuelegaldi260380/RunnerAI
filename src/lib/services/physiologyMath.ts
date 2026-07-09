// ---------------------------------------------------------------------------
// Funzioni pure per il calcolo del gemello fisiologico (Modulo 2).
// Nessun import di DB: isolate per essere testabili e riusabili.
// ---------------------------------------------------------------------------

export interface Split {
  paceSecPerKm?: number | null;
  hr?: number | null;
  distanceM?: number | null;
  durationSec?: number | null;
}

export interface HrZone {
  min: number;
  max: number;
}
export type HrZones = { z1: HrZone; z2: HrZone; z3: HrZone; z4: HrZone; z5: HrZone };

/** Mediana di una lista (ignora i non-finiti). Null se vuota. */
export function median(xs: number[]): number | null {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Pendenza di una regressione lineare semplice y = a + b·x (ritorna b). */
export function linRegSlope(pts: { x: number; y: number }[]): number | null {
  if (pts.length < 4) return null;
  const n = pts.length;
  const sx = pts.reduce((s, p) => s + p.x, 0);
  const sy = pts.reduce((s, p) => s + p.y, 0);
  const sxx = pts.reduce((s, p) => s + p.x * p.x, 0);
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-9) return null; // nessuna varianza in x
  return (n * sxy - sx * sy) / denom;
}

/**
 * Decoupling aerobico (Pa:Hr) su una serie di split: confronta l'efficienza
 * (velocità/FC) nella prima metà vs seconda metà. % positiva = drift cardiaco.
 */
export function decoupling(splits: Split[]): number | null {
  const usable = splits.filter(
    (s) => s.paceSecPerKm && s.paceSecPerKm > 0 && s.hr && s.hr > 0,
  );
  if (usable.length < 4) return null;
  const half = Math.floor(usable.length / 2);
  const ef = (arr: Split[]) => {
    const vals = arr.map((s) => 1 / s.paceSecPerKm! / s.hr!);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const first = ef(usable.slice(0, half));
  const second = ef(usable.slice(half));
  if (!(first > 0)) return null;
  return ((first - second) / first) * 100;
}

/** Degrado del passo: media ultimo quarto vs primo quarto degli split (%). */
export function paceDegradation(splits: Split[]): number | null {
  const usable = splits.filter((s) => s.paceSecPerKm && s.paceSecPerKm > 0);
  if (usable.length < 4) return null;
  const q = Math.max(1, Math.floor(usable.length / 4));
  const avg = (arr: Split[]) =>
    arr.reduce((a, s) => a + s.paceSecPerKm!, 0) / arr.length;
  const firstQ = avg(usable.slice(0, q));
  const lastQ = avg(usable.slice(-q));
  if (!(firstQ > 0)) return null;
  return ((lastQ - firstQ) / firstQ) * 100;
}

/** Calcola le zone FC dalla LTHR (modello di corsa alla Friel, % di LThr). */
export function zonesFromLthr(lthr: number, maxHr: number): HrZones {
  const hi = Math.max(maxHr, Math.round(lthr * 1.06));
  const p = (f: number) => Math.round(lthr * f);
  return {
    z1: { min: 0, max: p(0.85) - 1 },
    z2: { min: p(0.85), max: p(0.89) },
    z3: { min: p(0.9), max: p(0.94) },
    z4: { min: p(0.95), max: p(0.99) },
    z5: { min: p(1.0), max: hi },
  };
}

export function round1(x: number | null): number | null {
  return x == null ? null : Math.round(x * 10) / 10;
}
