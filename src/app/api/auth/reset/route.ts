import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { consumeAuthToken } from "@/lib/authTokens";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = body?.token?.toString();
  const password = body?.password?.toString();
  if (!token || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Token o password non validi (min 8 caratteri)" },
      { status: 400 },
    );
  }

  const userId = await consumeAuthToken(token, "reset");
  if (!userId) {
    return NextResponse.json(
      { error: "Link non valido o scaduto" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.update({ where: { id: userId }, data: { passwordHash } });
  return NextResponse.json({ ok: true });
}
