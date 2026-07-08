import { NextResponse } from "next/server";
import { isServiceAuthorized } from "@/lib/serviceAuth";
import { db } from "@/lib/db";
import { computePhysiologyProfile } from "@/lib/services/physiologyProfile";

export const maxDuration = 60;

/**
 * Ricalcolo servizio->servizio del Gemello Fisiologico (per cron/worker).
 * Body: { userId }. Protetto da SERVICE_TOKEN.
 */
export async function POST(req: Request) {
  if (!isServiceAuthorized(req)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const userId = body?.userId as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "userId richiesto" }, { status: 400 });
  }
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "utente inesistente" }, { status: 404 });
  }
  const profile = await computePhysiologyProfile(userId);
  return NextResponse.json({ ok: true, profile });
}
