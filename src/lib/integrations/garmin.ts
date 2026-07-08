import { GarminConnect } from "garmin-connect";
import { db } from "@/lib/db";
import { encryptionConfigured } from "@/lib/crypto";
import { getConnection, readTokens, saveConnection } from "./tokens";
import { matchActivityToPlan } from "@/lib/services/matchWorkout";
import { assessActivity } from "@/lib/services/assessActivity";

/**
 * Integrazione Garmin tramite login NON ufficiale (libreria garmin-connect):
 * usa email + password dell'utente. Le credenziali sono CIFRATE a riposo
 * (AES-256-GCM, vedi src/lib/crypto.ts). Sync on-demand + schedulata giornaliera.
 *
 * NB: metodo non ufficiale, può rompersi se Garmin cambia il login o se
 * l'account ha la verifica in due passaggi (MFA) attiva.
 */

export function garminReady(): boolean {
  return encryptionConfigured();
}

/** Testa un login Garmin con credenziali fornite (senza salvare) */
export async function testGarminLogin(email: string, password: string): Promise<void> {
  const client = new GarminConnect({ username: email, password });
  await client.login();
}

/** Testa la connessione Garmin salvata dell'utente */
export async function testGarminStored(userId: string): Promise<void> {
  const conn = await getConnection(userId, "garmin");
  if (!conn?.externalUserId) throw new Error("Garmin non collegato");
  const { accessToken: password } = readTokens(conn);
  const client = new GarminConnect({ username: conn.externalUserId, password });
  await client.login();
}

/** Verifica le credenziali e salva la connessione (password cifrata) */
export async function connectGarmin(
  userId: string,
  email: string,
  password: string,
): Promise<void> {
  const client = new GarminConnect({ username: email, password });
  await client.login(); // lancia se credenziali errate / MFA
  await saveConnection(userId, "garmin", {
    accessToken: password, // salvata cifrata
    externalUserId: email,
  });
}

function mapType(typeKey: string): string | undefined {
  const k = (typeKey || "").toLowerCase();
  if (k.includes("trail")) return "long";
  if (k.includes("track")) return "interval";
  return undefined; // intensità non deducibile: la lasciamo aperta
}

interface GarminActivity {
  activityId: number;
  activityName?: string;
  startTimeGMT?: string;
  startTimeLocal?: string;
  activityType?: { typeKey?: string };
  distance?: number; // m
  duration?: number; // s
  elevationGain?: number;
  averageHR?: number;
  maxHR?: number;
  averageRunningCadenceInStepsPerMinute?: number;
  calories?: number;
}

/**
 * Sincronizza lo storico attività di corsa da Garmin.
 * @param limit numero di attività da scaricare (storico performance)
 */
export async function syncGarmin(
  userId: string,
  limit = 50,
  lang = "it",
): Promise<{ imported: number }> {
  const conn = await getConnection(userId, "garmin");
  if (!conn) throw new Error("Garmin non collegato");
  const email = conn.externalUserId;
  if (!email) throw new Error("Credenziali Garmin mancanti");
  const { accessToken: password } = readTokens(conn);

  const client = new GarminConnect({ username: email, password });
  try {
    await client.login();
  } catch {
    await db.integrationConnection.updateMany({
      where: { userId, provider: "garmin" },
      data: { status: "error" },
    });
    throw new Error(
      "Login Garmin fallito: credenziali errate o verifica in due passaggi attiva.",
    );
  }

  const activities = (await client.getActivities(0, limit)) as GarminActivity[];

  // Dedup in una sola query invece di N: evita N+1 su Neon (latenza * n attività),
  // critico nel cron garmin-sync che itera su molti utenti.
  const runs = activities.filter((a) =>
    (a.activityType?.typeKey ?? "").toLowerCase().includes("run"),
  );
  const existing = await db.activity.findMany({
    where: {
      userId,
      source: "GARMIN",
      externalId: { in: runs.map((a) => String(a.activityId)) },
    },
    select: { externalId: true },
  });
  const seen = new Set(existing.map((e) => e.externalId));

  let imported = 0;
  const newIds: string[] = [];
  for (const a of runs) {
    const typeKey = a.activityType?.typeKey ?? "";
    const externalId = String(a.activityId);
    if (seen.has(externalId)) continue;

    const distanceKm = a.distance ? a.distance / 1000 : null;
    const durationSec = a.duration ? Math.round(a.duration) : null;
    const avgPace =
      distanceKm && durationSec ? Math.round(durationSec / distanceKm) : null;

    const created = await db.activity.create({
      data: {
        userId,
        source: "GARMIN",
        externalId,
        type: mapType(typeKey),
        date: new Date(a.startTimeGMT || a.startTimeLocal || Date.now()),
        distanceKm: distanceKm ?? undefined,
        durationSec: durationSec ?? undefined,
        avgPaceSecPerKm: avgPace ?? undefined,
        avgHr: a.averageHR ? Math.round(a.averageHR) : undefined,
        maxHr: a.maxHR ? Math.round(a.maxHR) : undefined,
        elevationGainM: a.elevationGain ? Math.round(a.elevationGain) : undefined,
        cadence: a.averageRunningCadenceInStepsPerMinute
          ? Math.round(a.averageRunningCadenceInStepsPerMinute)
          : undefined,
        calories: a.calories ? Math.round(a.calories) : undefined,
        notes: a.activityName,
        rawExtract: a as unknown as object,
      },
    });
    await matchActivityToPlan(userId, created.id, created.date, created.type).catch(() => {});
    newIds.push(created.id);
    imported++;
  }

  await db.integrationConnection.updateMany({
    where: { userId, provider: "garmin" },
    data: { lastSyncAt: new Date(), status: "connected" },
  });

  // giudizio di merito dell'AI sugli allenamenti più recenti importati (cap per costi)
  for (const id of newIds.slice(0, 3)) {
    await assessActivity(userId, id, lang).catch(() => null);
  }

  return { imported };
}
