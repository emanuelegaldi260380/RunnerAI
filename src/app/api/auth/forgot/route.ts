import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAuthToken } from "@/lib/authTokens";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.toString().trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email richiesta" }, { status: 400 });

  // rate limit per IP: impedisce di ciclare email diverse per spam di invii.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (!(await rateLimit(`forgot-ip:${ip}`, 20, 15 * 60_000))) {
    return NextResponse.json({ ok: true }); // non rivelare nulla
  }

  // rate limit per email
  if (!(await rateLimit(`forgot:${email}`, 3, 15 * 60_000))) {
    return NextResponse.json({ ok: true }); // non rivelare nulla
  }

  const user = await db.user.findUnique({ where: { email } });
  if (user && user.passwordHash) {
    const token = await createAuthToken(user.id, "reset", 60 * 60_000); // 1h
    const url = `${process.env.APP_URL || "http://localhost:3000"}/reset?token=${token}`;
    await sendEmail({
      to: email,
      subject: "Reimposta la tua password — RunnerAI",
      html: `<p>Hai richiesto di reimpostare la password.</p><p><a href="${url}">Clicca qui per reimpostarla</a> (valido 1 ora).</p><p>Se non sei stato tu, ignora questa email.</p>`,
    });
  }

  // risposta identica a prescindere (no user enumeration)
  return NextResponse.json({ ok: true });
}
