import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAccessState } from "@/lib/subscription";
import { rateLimit } from "@/lib/rateLimit";
import { computePhysiologyProfile } from "@/lib/services/physiology";
import { logger } from "@/lib/logger";

// Ricalcolo del gemello fisiologico (Modulo 2) su richiesta dell'utente.
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const access = await getAccessState(session.user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: "Abbonamento non attivo" }, { status: 402 });
  }
  if (!(await rateLimit(`physio:${session.user.id}`, 6, 60 * 60_000))) {
    return NextResponse.json(
      { error: "Troppi ricalcoli. Riprova più tardi." },
      { status: 429 },
    );
  }
  try {
    const result = await computePhysiologyProfile(session.user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    logger.error("Ricalcolo gemello fisiologico fallito", e);
    return NextResponse.json(
      { error: "Ricalcolo fallito. Riprova più tardi." },
      { status: 500 },
    );
  }
}
