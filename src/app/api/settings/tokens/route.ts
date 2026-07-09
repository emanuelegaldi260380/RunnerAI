import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { newToken } from "@/lib/apiToken";

const MAX_TOKENS = 10;

// Elenco dei token personali dell'utente (senza il valore in chiaro).
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const tokens = await db.apiToken.findMany({
    where: { userId: session.user.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
  });
  return NextResponse.json({ tokens });
}

// Crea un nuovo token. Il valore in chiaro è restituito UNA sola volta.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  if (!(await rateLimit(`token:${session.user.id}`, 10, 60 * 60_000))) {
    return NextResponse.json({ error: "Troppe richieste." }, { status: 429 });
  }
  const active = await db.apiToken.count({
    where: { userId: session.user.id, revokedAt: null },
  });
  if (active >= MAX_TOKENS) {
    return NextResponse.json(
      { error: `Massimo ${MAX_TOKENS} token attivi. Revocane uno.` },
      { status: 400 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const rawName = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const name = rawName || "Token";

  const { token, tokenHash, prefix } = newToken();
  const created = await db.apiToken.create({
    data: { userId: session.user.id, name, tokenHash, prefix },
    select: { id: true, name: true, prefix: true, createdAt: true },
  });
  // `token` è mostrato una sola volta: non è più recuperabile dal DB.
  return NextResponse.json({ ok: true, token, meta: created }, { status: 201 });
}
