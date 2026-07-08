import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";

const VALID = ["trial", "basic", "pro", "none"];

export async function POST(req: Request) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const email = body?.email?.toString().trim().toLowerCase();
  const tier = body?.tier?.toString();
  if (!email || !VALID.includes(tier)) {
    return NextResponse.json({ error: "Email o tier non validi" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  if (tier === "none") {
    // rimuove l'override (torna alla logica normale Stripe/trial)
    await db.subscription.updateMany({
      where: { userId: user.id },
      data: { forcedTier: null },
    });
  } else {
    await db.subscription.upsert({
      where: { userId: user.id },
      update: { forcedTier: tier, status: "active" },
      create: { userId: user.id, forcedTier: tier, status: "active" },
    });
  }

  return NextResponse.json({ ok: true, email, tier });
}
