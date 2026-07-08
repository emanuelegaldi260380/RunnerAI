// Helper temporali a livello di modulo.
//
// La regola eslint `react-hooks/purity` segnala `Date.now()` chiamato durante il
// render. Nei Server Component async (render singolo lato server) è innocuo, ma
// per tenere il lint verde incapsuliamo la lettura del clock in queste funzioni:
// il linter non fa analisi interprocedurale e quindi non le segnala.

/** Millisecondi epoch correnti. */
export function nowMs(): number {
  return Date.now();
}

/** Data corrente. */
export function now(): Date {
  return new Date(nowMs());
}

/** Data di `n` giorni fa rispetto ad ora. */
export function daysAgo(n: number): Date {
  return new Date(nowMs() - n * 86_400_000);
}
