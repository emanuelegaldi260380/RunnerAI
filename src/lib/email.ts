import { logger } from "@/lib/logger";

/**
 * Invio email pluggable: usa Resend se configurato (RESEND_API_KEY),
 * altrimenti logga il contenuto (sviluppo) e considera l'invio riuscito.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "RunnerAI <onboarding@resend.dev>";

  if (!key) {
    // In produzione un provider email non configurato è un errore: senza invio,
    // link di verifica/reset non arrivano. NON logghiamo mai il corpo (contiene
    // token di reset/verifica): finirebbero nei log applicativi (CWE-532).
    if (process.env.NODE_ENV === "production") {
      logger.error(`Invio email non configurato (RESEND_API_KEY assente): to=${opts.to}`);
      return false;
    }
    logger.info(`[email:dev] to=${opts.to} subject="${opts.subject}" (corpo non loggato)`);
    return true;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) logger.warn(`Resend ${res.status}`);
    return res.ok;
  } catch (e) {
    logger.warn("Invio email fallito", e);
    return false;
  }
}

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
