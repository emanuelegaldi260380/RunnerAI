// Logger minimale con timestamp + inoltro errori a un webhook opzionale
// (ERROR_WEBHOOK_URL, es. Slack/Discord/monitoring). In produzione:
// rimpiazzabile con pino/Sentry.
type Level = "info" | "warn" | "error";

function metaText(meta: unknown): string {
  if (meta === undefined) return "";
  if (meta instanceof Error) return meta.message;
  try {
    return JSON.stringify(meta).slice(0, 800);
  } catch {
    return String(meta);
  }
}

function log(level: Level, msg: string, meta?: unknown) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (meta !== undefined) fn(line, meta);
  else fn(line);

  if (level === "error" && process.env.ERROR_WEBHOOK_URL) {
    // fire-and-forget
    fetch(process.env.ERROR_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `🔴 RunnerAI: ${msg} — ${metaText(meta)}` }),
    }).catch(() => {});
  }
}

export const logger = {
  info: (msg: string, meta?: unknown) => log("info", msg, meta),
  warn: (msg: string, meta?: unknown) => log("warn", msg, meta),
  error: (msg: string, meta?: unknown) => log("error", msg, meta),
};
