import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAccessState } from "@/lib/subscription";
import { syncGarmin } from "@/lib/integrations/garmin";
import { runWithUser } from "@/lib/requestContext";
import { getServerLang } from "@/lib/i18n-server";
import { logger } from "@/lib/logger";

export const maxDuration = 120;

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const access = await getAccessState(session.user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: "Abbonamento non attivo" }, { status: 402 });
  }
  try {
    const lang = await getServerLang();
    const result = await runWithUser(session.user.id, () =>
      syncGarmin(session.user.id, 50, lang),
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    logger.error("Sync Garmin fallito", e);
    return NextResponse.json(
      { error: "Sincronizzazione Garmin fallita. Riprova più tardi." },
      { status: 500 },
    );
  }
}
