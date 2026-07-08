import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getStripe, stripeConfigured } from "@/lib/stripe";

/**
 * Disdetta online diretta e immediata (art. 54-bis Cod. Consumo): l'utente può
 * disdire con la stessa facilità con cui si è iscritto, senza passaggi
 * aggiuntivi. La cessazione ha effetto a fine periodo già pagato.
 * body: { cancel: boolean } — true = disdici, false = riattiva.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const cancel = body?.cancel !== false; // default: disdici

  const sub = await db.subscription.findUnique({
    where: { userId: session.user.id },
  });
  if (!sub?.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "Nessun abbonamento attivo da disdire" },
      { status: 400 },
    );
  }

  if (stripeConfigured()) {
    try {
      const stripe = getStripe();
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: cancel,
      });
    } catch (e) {
      return NextResponse.json(
        { error: "Errore nella richiesta a Stripe: " + (e instanceof Error ? e.message : "sconosciuto") },
        { status: 502 },
      );
    }
  }

  // Aggiorna subito lo stato locale (il webhook lo confermerà comunque)
  await db.subscription.update({
    where: { userId: session.user.id },
    data: { cancelAtPeriodEnd: cancel },
  });

  return NextResponse.json({ ok: true, cancelAtPeriodEnd: cancel });
}
