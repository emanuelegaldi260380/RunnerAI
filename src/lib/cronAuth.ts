import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { timingSafeEqualStr } from "@/lib/safeCompare";

/**
 * Autorizza le route "cron" (che consumano token LLM):
 * - header Authorization: Bearer <CRON_SECRET> (scheduler/Vercel Cron), oppure
 * - utente ADMIN (trigger manuale controllato).
 * Gli utenti normali NON possono innescarle: l'aggiornamento avviene solo
 * periodicamente via cron, per evitare consumo di token a piacimento.
 */
export async function isCronAuthorized(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.get("authorization");
    if (header && timingSafeEqualStr(header, `Bearer ${secret}`)) return true;
  }
  const session = await auth();
  return isAdminEmail(session?.user?.email);
}
