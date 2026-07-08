import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAccessState } from "@/lib/subscription";
import { rateLimit } from "@/lib/rateLimit";
import { deepSyncGarmin, garminBridgeConfigured } from "@/lib/integrations/garminBridge";

// Il bridge fa browser-automation: può richiedere minuti.
export const maxDuration = 300;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const access = await getAccessState(session.user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: "Abbonamento non attivo" }, { status: 402 });
  }
  if (!garminBridgeConfigured()) {
    return NextResponse.json(
      { error: "Garmin Bridge non configurato (GARMIN_BRIDGE_URL)" },
      { status: 501 },
    );
  }
  // sync pesante: max 3 all'ora per utente
  if (!(await rateLimit(`garmin-deep:${session.user.id}`, 3, 60 * 60_000))) {
    return NextResponse.json(
      { error: "Troppe sincronizzazioni. Riprova più tardi." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const days = Math.min(365, Math.max(7, Number(body?.days) || 90));

  try {
    const result = await deepSyncGarmin(session.user.id, days);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error, needsSupervisedLogin: result.needsSupervisedLogin },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, ...result.summary });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "errore" },
      { status: 500 },
    );
  }
}
