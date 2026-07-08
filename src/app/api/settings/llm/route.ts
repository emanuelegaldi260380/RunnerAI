import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const n = Number(body?.llmCount);
  if (![1, 2, 3].includes(n)) {
    return NextResponse.json({ error: "Valore non valido" }, { status: 400 });
  }

  const profile = await db.athleteProfile.findUnique({
    where: { userId: session.user.id },
  });
  const prefs =
    (profile?.preferences as Record<string, unknown> | null) ?? {};
  const merged = { ...prefs, llmCount: n };

  await db.athleteProfile.upsert({
    where: { userId: session.user.id },
    update: { preferences: merged },
    create: { userId: session.user.id, preferences: { llmCount: n } },
  });

  return NextResponse.json({ ok: true, llmCount: n });
}
