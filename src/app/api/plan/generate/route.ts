import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessState } from "@/lib/subscription";
import { checkLimit } from "@/lib/plans";
import { generatePlan } from "@/lib/services/planEngine";
import { runWithUser } from "@/lib/requestContext";
import { rateLimit } from "@/lib/rateLimit";
import { getServerLang } from "@/lib/i18n-server";
import { logger } from "@/lib/logger";

// la generazione può richiedere tempo (3 chiamate LLM)
export const maxDuration = 120;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const customPrompt =
    typeof body?.customPrompt === "string"
      ? body.customPrompt.slice(0, 2000)
      : null;
  const access = await getAccessState(session.user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: "Abbonamento non attivo" }, { status: 402 });
  }

  if (!(await rateLimit(`plan:${session.user.id}`, 5, 60_000))) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova tra poco." },
      { status: 429 },
    );
  }

  const limit = await checkLimit(session.user.id, "plan");
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Limite mensile raggiunto (${limit.used}/${limit.limit} generazioni piano). Passa a un piano superiore per continuare.`,
        limitReached: true,
      },
      { status: 429 },
    );
  }

  // salva il prompt personalizzato nelle preferenze (per ricordarlo)
  try {
    const profile = await db.athleteProfile.findUnique({
      where: { userId: session.user.id },
    });
    const prefs = (profile?.preferences as Record<string, unknown> | null) ?? {};
    await db.athleteProfile.upsert({
      where: { userId: session.user.id },
      update: { preferences: { ...prefs, customPlanPrompt: customPrompt ?? "" } },
      create: {
        userId: session.user.id,
        preferences: { customPlanPrompt: customPrompt ?? "" },
      },
    });
  } catch {
    /* non bloccare la generazione */
  }

  const lang = await getServerLang();
  try {
    const result = await runWithUser(session.user.id, () =>
      generatePlan(session.user.id, customPrompt, lang),
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    logger.error("Generazione piano fallita", e);
    return NextResponse.json(
      { error: "Generazione fallita. Riprova più tardi." },
      { status: 500 },
    );
  }
}
