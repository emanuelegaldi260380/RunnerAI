import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { raceSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = raceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 },
    );
  }
  const r = parsed.data;
  const race = await db.raceGoal.create({
    data: {
      userId: session.user.id,
      name: r.name,
      distanceKm: r.distanceKm,
      raceDate: r.raceDate ? new Date(r.raceDate) : null,
      targetTimeSec: r.targetTimeSec ?? null,
      priority: r.priority,
      notes: r.notes ?? null,
    },
  });
  return NextResponse.json({ ok: true, race }, { status: 201 });
}
