import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { computeSubjectiveMapping } from "@/lib/services/subjectiveMapping";
import { logger } from "@/lib/logger";

// Mappatura soggettivo↔oggettivo (Modulo 4), calcolata al volo dai log dell'utente.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  try {
    const mapping = await computeSubjectiveMapping(session.user.id);
    // Non mostrare all'atleta le correlazioni deboli: sono troppo fragili per
    // agire, coerentemente con il blocco iniettato nel prompt del piano.
    const insights = mapping.insights.filter((i) => i.strength !== "weak");
    return NextResponse.json({ ok: true, ...mapping, insights });
  } catch (e) {
    logger.error("Mappatura soggettiva fallita", e);
    return NextResponse.json({ error: "Calcolo fallito." }, { status: 500 });
  }
}
