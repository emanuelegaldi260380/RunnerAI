import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function ownWorkout(userId: string, id: string) {
  return db.plannedWorkout.findFirst({
    where: { id, plan: { userId } },
  });
}

/** Sposta un allenamento a un'altra data */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const dateStr = body?.date?.toString();

  const w = await ownWorkout(session.user.id, id);
  if (!w) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const data: { date?: Date } = {};
  if (dateStr) {
    const d = new Date(dateStr + "T00:00:00.000Z");
    if (isNaN(d.getTime())) return NextResponse.json({ error: "Data non valida" }, { status: 400 });
    data.date = d;
  }
  await db.plannedWorkout.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

/** Elimina un allenamento dal piano */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;
  const w = await ownWorkout(session.user.id, id);
  if (!w) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  await db.plannedWorkout.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
