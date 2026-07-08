import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getAccessState } from "@/lib/subscription";
import { rateLimit } from "@/lib/rateLimit";
import { getOrCreateExerciseSequence } from "@/lib/services/exerciseImage";

export const maxDuration = 120;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "";
  if (!name) return NextResponse.json({ steps: [] });
  const admin = isAdminEmail(session.user.email);
  // Ogni sequenza nuova genera 3 immagini a pagamento: gating accesso +
  // rate-limit per-utente (gli admin sono esenti dal limite).
  const access = await getAccessState(session.user.id);
  if (!access.hasAccess && !admin) {
    return NextResponse.json({ error: "Abbonamento non attivo" }, { status: 402 });
  }
  if (!admin && !(await rateLimit(`ex-seq:${session.user.id}`, 6, 60_000))) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova tra poco." },
      { status: 429 },
    );
  }
  const force = url.searchParams.get("force") === "1" && admin;
  const steps = await getOrCreateExerciseSequence(name, force);
  return NextResponse.json({ steps });
}
