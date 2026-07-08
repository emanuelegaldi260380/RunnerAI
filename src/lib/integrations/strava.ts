import { db } from "@/lib/db";
import { getConnection, readTokens, saveConnection } from "./tokens";
import { matchActivityToPlan } from "@/lib/services/matchWorkout";
import { assessActivity } from "@/lib/services/assessActivity";

const AUTH_URL = "https://www.strava.com/oauth/authorize";
const TOKEN_URL = "https://www.strava.com/oauth/token";
const API = "https://www.strava.com/api/v3";

export function stravaConfigured(): boolean {
  return !!process.env.STRAVA_CLIENT_ID && !!process.env.STRAVA_CLIENT_SECRET;
}

function redirectUri(): string {
  const base = process.env.APP_URL || "http://localhost:3000";
  return `${base}/api/integrations/strava/callback`;
}

export function buildAuthUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    response_type: "code",
    redirect_uri: redirectUri(),
    approval_prompt: "auto",
    scope: "read,activity:read_all",
    state,
  });
  return `${AUTH_URL}?${p.toString()}`;
}

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete?: { id: number };
}

export async function exchangeCode(code: string): Promise<StravaTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange fallito: ${res.status}`);
  return res.json();
}

async function refresh(refreshToken: string): Promise<StravaTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Strava refresh fallito: ${res.status}`);
  return res.json();
}

/** Salva la connessione dopo lo scambio del code */
export async function connectFromCode(userId: string, code: string) {
  const t = await exchangeCode(code);
  await saveConnection(userId, "strava", {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: new Date(t.expires_at * 1000),
    scope: "read,activity:read_all",
    externalUserId: t.athlete?.id ? String(t.athlete.id) : null,
  });
}

/** Restituisce un access token valido, rinfrescandolo se scaduto */
async function getValidAccessToken(userId: string): Promise<string> {
  const conn = await getConnection(userId, "strava");
  if (!conn) throw new Error("Strava non collegato");
  const { accessToken, refreshToken } = readTokens(conn);

  const expired = conn.expiresAt && conn.expiresAt.getTime() < Date.now() + 60_000;
  if (expired && refreshToken) {
    const t = await refresh(refreshToken);
    await saveConnection(userId, "strava", {
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresAt: new Date(t.expires_at * 1000),
      scope: conn.scope,
      externalUserId: conn.externalUserId,
    });
    return t.access_token;
  }
  return accessToken;
}

interface StravaActivity {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  distance: number; // m
  moving_time: number; // s
  total_elevation_gain?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  start_date: string; // ISO
}

/** Testa la connessione Strava salvata (token valido + chiamata API) */
export async function testStrava(userId: string): Promise<void> {
  const token = await getValidAccessToken(userId);
  const res = await fetch(`${API}/athlete`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Strava ${res.status}`);
}

/** Sincronizza le ultime attività di corsa da Strava */
export async function syncStrava(
  userId: string,
  lang = "it",
): Promise<{ imported: number }> {
  const token = await getValidAccessToken(userId);
  const res = await fetch(`${API}/athlete/activities?per_page=30`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Strava activities fallito: ${res.status}`);
  const activities = (await res.json()) as StravaActivity[];

  // Dedup in una sola query invece di N: evita N+1 su Neon (latenza * n attività).
  const runs = activities.filter((a) =>
    (a.sport_type || a.type || "").toLowerCase().includes("run"),
  );
  const existing = await db.activity.findMany({
    where: {
      userId,
      source: "STRAVA",
      externalId: { in: runs.map((a) => String(a.id)) },
    },
    select: { externalId: true },
  });
  const seen = new Set(existing.map((e) => e.externalId));

  let imported = 0;
  const newIds: string[] = [];
  for (const a of runs) {
    const sport = (a.sport_type || a.type || "").toLowerCase();
    const externalId = String(a.id);
    if (seen.has(externalId)) continue;

    const distanceKm = a.distance ? a.distance / 1000 : null;
    const durationSec = a.moving_time || null;
    const avgPaceSecPerKm =
      distanceKm && durationSec ? Math.round(durationSec / distanceKm) : null;

    const created = await db.activity.create({
      data: {
        userId,
        source: "STRAVA",
        externalId,
        type: sport.includes("trail") ? "long" : undefined,
        date: new Date(a.start_date),
        distanceKm: distanceKm ?? undefined,
        durationSec: durationSec ?? undefined,
        avgPaceSecPerKm: avgPaceSecPerKm ?? undefined,
        avgHr: a.average_heartrate ? Math.round(a.average_heartrate) : undefined,
        maxHr: a.max_heartrate ? Math.round(a.max_heartrate) : undefined,
        elevationGainM: a.total_elevation_gain
          ? Math.round(a.total_elevation_gain)
          : undefined,
        cadence: a.average_cadence ? Math.round(a.average_cadence) : undefined,
        notes: a.name,
        rawExtract: a as unknown as object,
      },
    });
    await matchActivityToPlan(userId, created.id, created.date, created.type).catch(() => {});
    newIds.push(created.id);
    imported++;
  }

  await db.integrationConnection.updateMany({
    where: { userId, provider: "strava" },
    data: { lastSyncAt: new Date() },
  });

  // giudizio di merito dell'AI sugli allenamenti più recenti importati (cap per costi)
  for (const id of newIds.slice(0, 3)) {
    await assessActivity(userId, id, lang).catch(() => null);
  }

  return { imported };
}
