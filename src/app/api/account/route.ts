import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { logger } from "@/lib/logger";

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const userId = session.user.id;

  // 1) annulla l'abbonamento Stripe (best-effort)
  try {
    const sub = await db.subscription.findUnique({ where: { userId } });
    if (sub?.stripeSubscriptionId && stripeConfigured()) {
      await getStripe().subscriptions.cancel(sub.stripeSubscriptionId);
    }
  } catch (e) {
    logger.warn("Stripe cancel in eliminazione account fallito", e);
  }

  // 2) elimina i file caricati (screenshot)
  try {
    await fs.rm(path.join(process.cwd(), "uploads", userId), {
      recursive: true,
      force: true,
    });
  } catch (e) {
    logger.warn("Rimozione upload fallita", e);
  }

  // 3) elimina l'utente e tutti i dati collegati (cascade)
  await db.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true });
}
