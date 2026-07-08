import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hrZonesSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = hrZonesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  await db.athleteProfile.upsert({
    where: { userId: session.user.id },
    update: { hrZones: parsed.data },
    create: { userId: session.user.id, hrZones: parsed.data },
  });

  return NextResponse.json({ ok: true });
}
