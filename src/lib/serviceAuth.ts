import { timingSafeEqualStr } from "@/lib/safeCompare";
import { usableSecret } from "@/lib/env";

/**
 * Autenticazione servizio->servizio per le API interne /api/service/*.
 * Usata da MCP server e agent worker (deployati a parte).
 */
export function isServiceAuthorized(req: Request): boolean {
  // usableSecret() scarta i placeholder pubblici (.env.example) in produzione:
  // un token noto non deve poter proteggere endpoint interni.
  const token = usableSecret(process.env.SERVICE_TOKEN);
  if (!token) return false;
  const header = req.headers.get("authorization");
  if (!header) return false;
  return timingSafeEqualStr(header, `Bearer ${token}`);
}
