import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Revoca (soft-delete) un token personale. Anti-IDOR: solo i propri token.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const { id } = await params;
  const owned = await db.apiToken.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Token non trovato" }, { status: 404 });
  }
  await db.apiToken.update({
    where: { id: owned.id },
    data: { revokedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
