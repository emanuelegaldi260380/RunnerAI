import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAccessState } from "@/lib/subscription";
import { rateLimit } from "@/lib/rateLimit";
import { getOrCreateExerciseImage } from "@/lib/services/exerciseImage";

export const maxDuration = 60;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  // La generazione immagini (gpt-image-1) è a pagamento: solo utenti con
  // accesso attivo, con rate-limit per-utente per prevenire abuso di costi.
  const access = await getAccessState(session.user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: "Abbonamento non attivo" }, { status: 402 });
  }
  if (!(await rateLimit(`ex-img:${session.user.id}`, 15, 60_000))) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova tra poco." },
      { status: 429 },
    );
  }
  const name = new URL(req.url).searchParams.get("name") ?? "";
  if (!name) return NextResponse.json({ path: null });
  const path = await getOrCreateExerciseImage(name);
  return NextResponse.json({ path });
}
