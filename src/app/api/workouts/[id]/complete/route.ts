import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const completed = body?.completed !== false;

  // verifica proprietà tramite il piano
  const workout = await db.plannedWorkout.findFirst({
    where: { id, plan: { userId: session.user.id } },
  });
  if (!workout) {
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  }

  await db.plannedWorkout.update({ where: { id }, data: { completed } });
  return NextResponse.json({ ok: true, completed });
}
