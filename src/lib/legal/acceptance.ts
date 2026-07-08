import { db } from "@/lib/db";
import { LEGAL_VERSIONS } from "./company";

export type LegalDocType =
  | "terms"
  | "privacy"
  | "vexatious" // approvazione specifica clausole vessatorie art. 1341-1342 c.c.
  | "withdrawal_waiver" // rinuncia recesso 14gg (art. 59 Cod. Consumo)
  | "cookie";

/** Estrae l'IP del client (best-effort) dagli header della richiesta. */
export function clientIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

/** Registra un'accettazione legale con prova (versione, data, IP, user-agent). */
export async function recordAcceptance(
  userId: string,
  docType: LegalDocType,
  version: string,
  req?: Request,
) {
  await db.legalAcceptance.create({
    data: {
      userId,
      docType,
      version,
      ip: req ? clientIp(req) : null,
      userAgent: req?.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
  });
}

/**
 * Registra i consensi richiesti in fase di registrazione:
 * - Termini e Condizioni
 * - Privacy Policy
 * - approvazione SPECIFICA delle clausole vessatorie (art. 1341-1342 c.c.)
 */
export async function recordRegistrationConsents(userId: string, req: Request) {
  await Promise.all([
    recordAcceptance(userId, "terms", LEGAL_VERSIONS.terms, req),
    recordAcceptance(userId, "privacy", LEGAL_VERSIONS.privacy, req),
    recordAcceptance(userId, "vexatious", LEGAL_VERSIONS.terms, req),
  ]);
}
