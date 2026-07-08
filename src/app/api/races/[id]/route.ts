import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const { id } = await params;
  // elimina solo se appartiene all'utente
  await db.raceGoal.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
