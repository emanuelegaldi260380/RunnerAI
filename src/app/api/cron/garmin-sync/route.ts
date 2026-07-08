import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCronAuthorized } from "@/lib/cronAuth";
import { syncGarmin } from "@/lib/integrations/garmin";

export const maxDuration = 300;

/** Sync giornaliera Garmin per tutti gli utenti collegati */
async function handle(req: Request) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const connections = await db.integrationConnection.findMany({
    where: { provider: "garmin", status: { in: ["connected", "error"] } },
    select: { userId: true },
  });

  let usersSynced = 0;
  let totalImported = 0;
  const errors: string[] = [];

  for (const c of connections) {
    try {
      const { imported } = await syncGarmin(c.userId, 30);
      totalImported += imported;
      usersSynced++;
    } catch (e) {
      errors.push(`${c.userId}: ${e instanceof Error ? e.message : "errore"}`);
    }
  }

  return NextResponse.json({
    ok: true,
    connections: connections.length,
    usersSynced,
    imported: totalImported,
    errors: errors.length,
  });
}

export const GET = handle;
export const POST = handle;
