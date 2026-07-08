// Hook di boot Next.js: eseguito una volta all'avvio del server, prima di
// servire richieste. Lo usiamo per validare la configurazione di sicurezza
// (segreti reali, store rate-limit, cifratura) e fallire subito se debole.
export async function register() {
  // Solo runtime Node (le env sensibili non vanno valutate su edge).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertSecureEnv } = await import("@/lib/env");
  assertSecureEnv();
}
