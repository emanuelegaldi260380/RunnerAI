import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getAccessState } from "@/lib/subscription";
import { rateLimit } from "@/lib/rateLimit";
import { getOrCreateScienceImage } from "@/lib/services/scienceImage";

export const maxDuration = 60;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  // Gating + rate-limit come sugli altri endpoint immagine: la generazione usa
  // gpt-image-1 (a pagamento) e non deve essere innescabile a piacimento (né da
  // utenti con trial scaduto).
  const access = await getAccessState(session.user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: "Abbonamento non attivo" }, { status: 402 });
  }
  if (!(await rateLimit(`kb-img:${session.user.id}`, 20, 60 * 60_000))) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova più tardi." },
      { status: 429 },
    );
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ path: null });
  const force = url.searchParams.get("force") === "1" && isAdminEmail(session.user.email);
  const path = await getOrCreateScienceImage(id, force);
  return NextResponse.json({ path });
}
