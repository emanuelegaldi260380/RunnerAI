import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

// Stripe richiede il body raw per la verifica della firma
export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook non configurato" }, { status: 501 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Firma mancante" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return NextResponse.json(
      { error: `Firma non valida: ${e instanceof Error ? e.message : ""}` },
      { status: 400 },
    );
  }

  // Idempotency: Stripe consegna at-least-once. Se l'evento è già stato
  // elaborato rispondiamo 200 senza rieseguire l'handler (evita doppi effetti).
  try {
    await db.processedStripeEvent.create({
      data: { id: event.id, type: event.type },
    });
  } catch {
    // create fallisce sul vincolo di PK -> evento duplicato: già processato.
    return NextResponse.json({ received: true, duplicate: true });
  }

  // event.created è in secondi unix: guardia contro consegne out-of-order.
  const eventAt = new Date(event.created * 1000);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.metadata?.userId;
        const customerId = s.customer as string;
        const subscriptionId = s.subscription as string;
        if (userId && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertFromStripe(userId, customerId, sub, eventAt);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const existing = await db.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });
        const userId =
          existing?.userId ?? (sub.metadata?.userId as string | undefined);
        if (userId) await upsertFromStripe(userId, customerId, sub, eventAt);
        break;
      }
      case "invoice.payment_failed": {
        // Declassa l'accesso senza attendere il successivo subscription.updated.
        const inv = event.data.object as Stripe.Invoice;
        const subId = subscriptionIdFromInvoice(inv);
        const customerId =
          typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        if (subId && customerId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const existing = await db.subscription.findFirst({
            where: { stripeCustomerId: customerId },
          });
          const userId =
            existing?.userId ?? (sub.metadata?.userId as string | undefined);
          if (userId) await upsertFromStripe(userId, customerId, sub, eventAt);
        }
        break;
      }
    }
  } catch (e) {
    // Handler fallito: rimuovi il marcatore di idempotency così Stripe può
    // riconsegnare l'evento e ritentare (altrimenti resterebbe perso).
    await db.processedStripeEvent.delete({ where: { id: event.id } }).catch(() => {});
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "errore handler" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

// La posizione della subscription sull'Invoice varia per versione di API Stripe:
// campo top-level (legacy) oppure dentro le righe (parent.subscription_details).
function subscriptionIdFromInvoice(inv: Stripe.Invoice): string | null {
  const legacy = (inv as unknown as { subscription?: string | { id: string } })
    .subscription;
  if (legacy) return typeof legacy === "string" ? legacy : legacy.id;
  const line = inv.lines?.data?.find(
    (l) => (l as unknown as { subscription?: string }).subscription,
  );
  const sub = line
    ? (line as unknown as { subscription?: string | { id: string } }).subscription
    : null;
  if (sub) return typeof sub === "string" ? sub : sub.id;
  return null;
}

async function upsertFromStripe(
  userId: string,
  customerId: string,
  sub: Stripe.Subscription,
  eventAt: Date,
) {
  const item = sub.items.data[0];
  const currentPeriodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;
  const trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000) : null;

  // Ordering guard: se abbiamo già applicato un evento più recente, ignora
  // questo (consegna out-of-order). Preserva lo stato più aggiornato.
  const existing = await db.subscription.findUnique({
    where: { userId },
    select: { stripeEventAt: true },
  });
  if (existing?.stripeEventAt && existing.stripeEventAt > eventAt) return;

  await db.subscription.upsert({
    where: { userId },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      stripePriceId: item?.price?.id ?? null,
      status: sub.status,
      currentPeriodEnd,
      trialEndsAt,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      stripeEventAt: eventAt,
    },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      stripePriceId: item?.price?.id ?? null,
      status: sub.status,
      currentPeriodEnd,
      trialEndsAt,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      stripeEventAt: eventAt,
    },
  });
}
