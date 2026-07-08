// Rate limiter pluggable:
// - Upstash Redis (REST) se configurato -> funziona su multi-istanza/serverless
// - altrimenti fallback in-memory (singola istanza)

const buckets = new Map<string, number[]>();
let lastPrune = 0;

// Potatura periodica: senza questa la Map cresce indefinitamente (una entry per
// ogni chiave distinta — es. forgot:<email>, ingest:<userId>) e diventa un leak
// di memoria su processi longevi.
function prune(now: number, windowMs: number) {
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  for (const [k, arr] of buckets) {
    const kept = arr.filter((t) => now - t < windowMs);
    if (kept.length === 0) buckets.delete(k);
    else buckets.set(k, kept);
  }
}

function memRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  prune(now, windowMs);
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  return true;
}

// Avviso una-tantum: in produzione il fallback in-memory NON è affidabile su
// serverless/multi-istanza (ogni lambda ha la propria Map), quindi i limiti
// anti-abuso sono aggirabili. Upstash Redis va configurato in produzione.
let warnedNoUpstash = false;
function warnIfNoSharedStore() {
  if (warnedNoUpstash) return;
  warnedNoUpstash = true;
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[rateLimit] UPSTASH_REDIS_REST_URL/TOKEN non configurati: rate limiting " +
        "in-memory inefficace su serverless. Configura Upstash in produzione.",
    );
  }
}

async function upstashRateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const bucket = Math.floor(Date.now() / windowMs);
  const k = `rl:${key}:${bucket}`;
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", k],
      ["EXPIRE", k, Math.ceil(windowMs / 1000)],
    ]),
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const data = (await res.json()) as { result: number }[];
  const count = data?.[0]?.result ?? 0;
  return count <= max;
}

/** true se consentito, false se limite superato. */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      return await upstashRateLimit(key, max, windowMs);
    } catch {
      /* fallback in-memory */
    }
  } else {
    warnIfNoSharedStore();
  }
  return memRateLimit(key, max, windowMs);
}
