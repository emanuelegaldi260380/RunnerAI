/** Retry con backoff esponenziale + jitter per le chiamate LLM/rete. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number } = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const baseMs = opts.baseMs ?? 800;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt === retries || !isRetryable(e)) throw e;
      const delay = baseMs * 2 ** attempt + Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function isRetryable(e: unknown): boolean {
  const err = e as { status?: number; response?: { status?: number }; message?: string };
  const status = err?.status ?? err?.response?.status;
  if (status && [408, 409, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  const msg = String(err?.message ?? "").toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("econn") ||
    msg.includes("etimedout") ||
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("overloaded") ||
    msg.includes("rate limit")
  );
}
