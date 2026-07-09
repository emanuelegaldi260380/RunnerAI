import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAccessState } from "@/lib/subscription";
import { rateLimit } from "@/lib/rateLimit";
import { runWithUser } from "@/lib/requestContext";
import { getServerLang } from "@/lib/i18n-server";
import { generateAutopsy } from "@/lib/services/autopsy";
import { logger } from "@/lib/logger";

// La generazione può richiedere una chiamata LLM.
export const maxDuration = 60;

// Autopsia post-performance (Modulo 1) di una specifica attività, su richiesta.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const access = await getAccessState(session.user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: "Abbonamento non attivo" }, { status: 402 });
  }
  if (!(await rateLimit(`autopsy:${session.user.id}`, 12, 60 * 60_000))) {
    return NextResponse.json(
      { error: "Troppe autopsie. Riprova più tardi." },
      { status: 429 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const activityId = typeof body?.activityId === "string" ? body.activityId : null;
  if (!activityId) {
    return NextResponse.json({ error: "activityId richiesto" }, { status: 400 });
  }

  const lang = await getServerLang();
  try {
    const result = await runWithUser(session.user.id, () =>
      generateAutopsy(session.user.id, activityId, lang),
    );
    if (!result) {
      return NextResponse.json(
        { error: "Attività non trovata o dati insufficienti." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    logger.error("Autopsia fallita", e);
    return NextResponse.json(
      { error: "Autopsia fallita. Riprova più tardi." },
      { status: 500 },
    );
  }
}
