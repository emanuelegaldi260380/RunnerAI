import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { subjectiveSchema } from "@/lib/validation";

/** Log soggettivo post-sessione (Modulo 4): RPE, gambe, sonno percepito, umore, niggle. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = subjectiveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const date = d.date ? new Date(d.date) : new Date();

  const log = await db.subjectiveLog.create({
    data: {
      userId: session.user.id,
      date,
      activityId: d.activityId ?? null,
      rpe: d.rpe ?? null,
      legs: d.legs ?? null,
      sleepPerceived: d.sleepPerceived ?? null,
      mood: d.mood ?? null,
      niggle: d.niggle ?? null,
      notes: d.notes ?? null,
    },
  });
  return NextResponse.json({ ok: true, id: log.id }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const logs = await db.subjectiveLog.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 30,
  });
  return NextResponse.json({ logs });
}
