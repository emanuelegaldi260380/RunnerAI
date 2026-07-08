import { NextResponse } from "next/server";
import { isServiceAuthorized } from "@/lib/serviceAuth";
import { ingestGarminTables, type GarminTables } from "@/lib/services/garminImport";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const maxDuration = 120;

/**
 * Ingestione servizio->servizio dei dati Garmin ricchi.
 * Body: { userId, tables }. Protetta da SERVICE_TOKEN.
 * Usata dal Garmin-Bridge (o per import diretto di un export).
 */
export async function POST(req: Request) {
  if (!isServiceAuthorized(req)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const userId = body?.userId as string | undefined;
  const tables = body?.tables as GarminTables | undefined;
  if (!userId || !tables) {
    return NextResponse.json({ error: "userId e tables richiesti" }, { status: 400 });
  }
  // Difesa in profondità: anche con SERVICE_TOKEN valido, non scrivere dati per
  // un userId inesistente (previene ingestione verso id arbitrari/typo).
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "utente inesistente" }, { status: 404 });
  }
  try {
    const summary = await ingestGarminTables(userId, tables);
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    logger.error("garmin-import fallito", e);
    return NextResponse.json({ error: "Ingestione fallita" }, { status: 500 });
  }
}
