import { getConnection, readTokens } from "./tokens";
import { ingestGarminTables, type GarminTables, type ImportSummary } from "@/lib/services/garminImport";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Client verso il Garmin-Bridge (server isolato Docker, vedi services/garmin-bridge).
// Beta friends & family: sync dati ricchi (sonno/HRV/RHR/stream/meteo) usando le
// credenziali Garmin già cifrate nell'IntegrationConnection dell'utente.
// ---------------------------------------------------------------------------

export function garminBridgeConfigured(): boolean {
  return !!process.env.GARMIN_BRIDGE_URL && !!process.env.SERVICE_TOKEN;
}

interface BridgeResponse {
  ok: boolean;
  counts?: Record<string, number>;
  tables?: GarminTables;
  error?: string;
  needs_supervised_login?: boolean;
}

/** Chiama il bridge per estrarre i dati Garmin ricchi dell'utente. */
export async function fetchFromBridge(
  userId: string,
  days = 90,
): Promise<BridgeResponse> {
  const base = process.env.GARMIN_BRIDGE_URL;
  const token = process.env.SERVICE_TOKEN;
  if (!base || !token) throw new Error("Garmin Bridge non configurato (GARMIN_BRIDGE_URL / SERVICE_TOKEN)");

  // La password Garmin in chiaro viaggia verso il bridge: esigi TLS. In sviluppo
  // si tollera http solo verso localhost (bridge in Docker locale).
  const bridgeUrl = new URL(base);
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(bridgeUrl.hostname);
  if (bridgeUrl.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && isLocal)) {
    throw new Error("GARMIN_BRIDGE_URL deve usare https:// (la password Garmin non può transitare in chiaro)");
  }

  const conn = await getConnection(userId, "garmin");
  if (!conn?.externalUserId) throw new Error("Garmin non collegato");
  const { accessToken: password } = readTokens(conn);

  const res = await fetch(`${base.replace(/\/$/, "")}/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ user_id: userId, email: conn.externalUserId, password, days }),
    // il bridge può metterci minuti (browser automation)
    signal: AbortSignal.timeout(30 * 60_000),
  });
  if (!res.ok) throw new Error(`Bridge HTTP ${res.status}`);
  return (await res.json()) as BridgeResponse;
}

/** Sync completo: bridge → ingestione nei modelli normalizzati. */
export async function deepSyncGarmin(
  userId: string,
  days = 90,
): Promise<{ summary: ImportSummary } | { error: string; needsSupervisedLogin?: boolean }> {
  const resp = await fetchFromBridge(userId, days);
  if (!resp.ok || !resp.tables) {
    return { error: resp.error ?? "Sync fallito", needsSupervisedLogin: resp.needs_supervised_login };
  }
  const summary = await ingestGarminTables(userId, resp.tables);
  await db.integrationConnection.updateMany({
    where: { userId, provider: "garmin" },
    data: { lastSyncAt: new Date(), status: "connected" },
  });
  return { summary };
}
