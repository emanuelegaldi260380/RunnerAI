import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { createTrialSubscription } from "@/lib/subscription";
import { createAuthToken } from "@/lib/authTokens";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rateLimit";
import { recordRegistrationConsents } from "@/lib/legal/acceptance";

export async function POST(req: Request) {
  // Anti-abuso: limita le registrazioni per IP (spam trial + invio email).
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (!(await rateLimit(`register:${ip}`, 5, 60 * 60_000))) {
    return NextResponse.json(
      { error: "Troppe registrazioni. Riprova più tardi." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 },
    );
  }
  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email già registrata" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      profile: { create: {} },
    },
  });

  await createTrialSubscription(user.id);

  // registra la prova dei consensi legali (Termini, Privacy, clausole vessatorie)
  try {
    await recordRegistrationConsents(user.id, req);
  } catch {
    /* non bloccare la registrazione se il logging del consenso fallisce */
  }

  // invia email di verifica (best-effort, non blocca la registrazione)
  try {
    const token = await createAuthToken(user.id, "verify", 24 * 60 * 60_000);
    const url = `${process.env.APP_URL || "http://localhost:3000"}/api/auth/verify?token=${token}`;
    await sendEmail({
      to: email,
      subject: "Conferma la tua email — RunnerAI",
      html: `<p>Benvenuto su RunnerAI!</p><p><a href="${url}">Conferma il tuo indirizzo email</a> (valido 24 ore).</p>`,
    });
  } catch {
    /* ignora */
  }

  return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
}
