// Service worker minimale: abilita l'installazione PWA.
// (Nessun caching aggressivo per non servire contenuti stantii.)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // passthrough: lascia gestire la rete al browser
});
