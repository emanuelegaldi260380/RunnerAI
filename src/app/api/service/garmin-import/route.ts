import { NextResponse } from "next/server";
import { isServiceAuthorized } from "@/lib/serviceAuth";
import { ingestGarminTables, type GarminTables } from "@/lib/services/garminImport";

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
  try {
    const summary = await ingestGarminTables(userId, tables);
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "errore" },
      { status: 500 },
    );
  }
}
