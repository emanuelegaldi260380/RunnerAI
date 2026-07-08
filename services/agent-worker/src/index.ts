/**
 * RunnerAI Agent Worker (deployabile a parte).
 * Esegue gli agenti schedulati (ricerca scientifica, rassegna stampa, sync Garmin)
 * chiamando le API cron di RunnerAI con CRON_SECRET. Disaccoppiato dal web.
 *
 * - `npm start`      -> avvia lo scheduler (long-running)
 * - `npm run once`   -> esegue tutti i job una volta e termina (utile per test/CI)
 */
import cron from "node-cron";

const BASE = process.env.RUNNERAI_URL || "http://localhost:3000";
const SECRET = process.env.CRON_SECRET || "";

const JOBS: { name: string; path: string; schedule: string }[] = [
  { name: "research", path: "/api/cron/research", schedule: "0 3 * * *" },
  { name: "press", path: "/api/cron/press", schedule: "0 6 * * *" },
  { name: "garmin-sync", path: "/api/cron/garmin-sync", schedule: "0 5 * * *" },
];

async function trigger(job: { name: string; path: string }): Promise<void> {
  const started = new Date().toISOString();
  try {
    const res = await fetch(`${BASE}${job.path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    });
    const body = await res.json().catch(() => ({}));
    console.error(`[${started}] ${job.name} -> ${res.status}`, JSON.stringify(body));
  } catch (e) {
    console.error(`[${started}] ${job.name} FALLITO:`, e instanceof Error ? e.message : e);
  }
}

async function main() {
  const runOnce = process.argv.includes("run");
  if (runOnce) {
    console.error("Esecuzione una tantum di tutti i job…");
    for (const job of JOBS) await trigger(job);
    console.error("Fatto.");
    return;
  }

  for (const job of JOBS) {
    cron.schedule(job.schedule, () => trigger(job));
    console.error(`Schedulato ${job.name} (${job.schedule})`);
  }
  console.error(`RunnerAI Agent Worker avviato. Target: ${BASE}`);
}

main();
