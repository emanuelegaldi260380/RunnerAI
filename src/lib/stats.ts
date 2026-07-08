/** Coefficiente di correlazione di Pearson. Null se meno di 3 punti o varianza nulla. */
export function pearson(pairs: [number, number][]): number | null {
  const n = pairs.length;
  if (n < 3) return null;
  let sx = 0,
    sy = 0,
    sxy = 0,
    sxx = 0,
    syy = 0;
  for (const [x, y] of pairs) {
    sx += x;
    sy += y;
    sxy += x * y;
    sxx += x * x;
    syy += y * y;
  }
  const num = n * sxy - sx * sy;
  const den = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  return den === 0 ? null : num / den;
}
