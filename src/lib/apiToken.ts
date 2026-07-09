import crypto from "crypto";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Token API personali (Modulo 5). Consentono al server MCP personale — o ad
// altri client dell'utente — di leggere il proprio contesto di allenamento.
// Nel DB vive solo l'hash SHA-256: il token in chiaro è mostrato una volta.
// ---------------------------------------------------------------------------

const PREFIX = "rai_";

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Genera un nuovo token opaco. Ritorna il valore in chiaro e i suoi metadati. */
export function newToken(): { token: string; tokenHash: string; prefix: string } {
  const token = PREFIX + crypto.randomBytes(24).toString("hex");
  return {
    token,
    tokenHash: hashToken(token),
    prefix: token.slice(0, 12), // es. "rai_1a2b3c4d"
  };
}

/**
 * Risolve l'utente da un header Authorization: Bearer <token personale>.
 * Aggiorna lastUsedAt (best-effort). Null se assente/revocato/non valido.
 */
export async function resolveUserFromToken(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const presented = header.slice(7).trim();
  if (!presented.startsWith(PREFIX)) return null;
  const tokenHash = hashToken(presented);
  const row = await db.apiToken.findUnique({ where: { tokenHash } });
  if (!row || row.revokedAt) return null;
  // best-effort: non bloccare la richiesta se l'update fallisce
  await db.apiToken
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => null);
  return row.userId;
}
