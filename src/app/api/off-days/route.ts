import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const dateStr = body?.date?.toString();
  const off = body?.off === true;
  if (!dateStr) {
    return NextResponse.json({ error: "Data richiesta" }, { status: 400 });
  }
  const date = new Date(dateStr + "T00:00:00.000Z");
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "Data non valida" }, { status: 400 });
  }

  if (off) {
    await db.offDay.upsert({
      where: { userId_date: { userId: session.user.id, date } },
      update: {},
      create: { userId: session.user.id, date },
    });
    // se c'è un allenamento pianificato quel giorno, mettilo a riposo
    await db.plannedWorkout.updateMany({
      where: {
        date,
        type: { not: "rest" },
        plan: { userId: session.user.id, status: "active" },
      },
      data: { type: "rest", title: "Giorno off", description: "Giorno non disponibile (off)." },
    });
  } else {
    await db.offDay.deleteMany({
      where: { userId: session.user.id, date },
    });
  }

  return NextResponse.json({ ok: true });
}
