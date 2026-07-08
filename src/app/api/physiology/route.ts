import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessState } from "@/lib/subscription";
import { rateLimit } from "@/lib/rateLimit";
import { computePhysiologyProfile } from "@/lib/services/physiologyProfile";

export const maxDuration = 60;

/** Ricalcola il Gemello Fisiologico dai dati reali dell'utente. */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const access = await getAccessState(session.user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: "Abbonamento non attivo" }, { status: 402 });
  }
  if (!(await rateLimit(`physio:${session.user.id}`, 10, 60 * 60_000))) {
    return NextResponse.json({ error: "Troppe richieste. Riprova più tardi." }, { status: 429 });
  }
  const result = await computePhysiologyProfile(session.user.id);
  return NextResponse.json({ ok: true, profile: result });
}

/** Legge il profilo salvato (o null se mai calcolato). */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const profile = await db.physiologyProfile.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json({ profile });
}
