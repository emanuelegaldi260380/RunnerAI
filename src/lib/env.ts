// Validazione delle variabili d'ambiente sensibili.
// - Rileva i segreti placeholder di .env.example (SERVICE_TOKEN/CRON_SECRET)
//   così endpoint interni non restano protetti da valori pubblicamente noti.
// - In produzione impone una configurazione minima sicura (segreti reali,
//   store di rate-limit distribuito, cifratura) fallendo il boot altrimenti.

/** Valori placeholder noti da .env.example: non devono mai proteggere prod. */
const PLACEHOLDER_SECRETS = new Set([
  "dev-service-token-change-me",
  "dev-cron-secret-change-me",
]);

export function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * true se il segreto è assente, è un placeholder noto, termina con "change-me"
 * o è troppo corto per avere entropia sufficiente (<24 char).
 */
export function isPlaceholderSecret(v: string | undefined | null): boolean {
  if (!v) return true;
  if (PLACEHOLDER_SECRETS.has(v)) return true;
  if (/change[-_]?me/i.test(v)) return true;
  return v.length < 24;
}

/**
 * In produzione un segreto placeholder equivale a "non configurato": le guardie
 * service/cron devono rifiutare la richiesta invece di fidarsi di un valore noto.
 * In sviluppo i placeholder restano validi per non intralciare il lavoro locale.
 */
export function usableSecret(v: string | undefined | null): string | null {
  if (!v) return null;
  if (isProd() && isPlaceholderSecret(v)) return null;
  return v;
}

/**
 * Controllo di configurazione al boot (chiamato da instrumentation.ts).
 * In produzione fallisce (throw) se la configurazione di sicurezza è debole,
 * così un deploy mal configurato non parte affatto. In sviluppo si limita a
 * loggare avvisi.
 */
export function assertSecureEnv(): void {
  const problems: string[] = [];

  if (isPlaceholderSecret(process.env.SERVICE_TOKEN)) {
    problems.push(
      "SERVICE_TOKEN mancante o placeholder ('*change-me'): genera un valore casuale (32B).",
    );
  }
  if (isPlaceholderSecret(process.env.CRON_SECRET)) {
    problems.push(
      "CRON_SECRET mancante o placeholder ('*change-me'): genera un valore casuale (32B).",
    );
  }
  if (!process.env.AUTH_SECRET) {
    problems.push("AUTH_SECRET mancante.");
  }
  if (!process.env.ENCRYPTION_KEY) {
    problems.push("ENCRYPTION_KEY mancante (cifratura token integrazioni).");
  }
  // Rate-limit distribuito: in-memory è inefficace su serverless/multi-istanza.
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    problems.push(
      "UPSTASH_REDIS_REST_URL/TOKEN mancanti: il rate limiting in-memory è aggirabile su serverless.",
    );
  }

  if (problems.length === 0) return;

  const header =
    "[env] Configurazione di sicurezza incompleta:\n - " +
    problems.join("\n - ");

  if (isProd()) {
    // Fail-fast: meglio non avviare che esporre endpoint interni / abuso costi.
    throw new Error(header);
  }
  // In sviluppo: solo avviso, non blocca.
  console.warn(header);
}
