import crypto from "crypto";

/**
 * Confronto di stringhe a tempo costante (anti timing-attack) per segreti come
 * bearer token. Fa l'hash SHA-256 di entrambi gli input così `timingSafeEqual`
 * riceve sempre buffer di pari lunghezza (evita di rivelare la lunghezza e la
 * sua eccezione su lunghezze diverse).
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a, "utf8").digest();
  const hb = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(ha, hb);
}
