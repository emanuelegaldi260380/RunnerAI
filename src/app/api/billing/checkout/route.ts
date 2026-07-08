import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { getAccessState } from "@/lib/subscription";
import { TIERS } from "@/lib/plans";
import { recordAcceptance } from "@/lib/legal/acceptance";
import { LEGAL_VERSIONS } from "@/lib/legal/company";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe non configurato (STRIPE_SECRET_KEY / STRIPE_PRICE_ID)" },
      { status: 501 },
    );
  }

  // scelta del piano (base | pro)
  const body = await req.json().catch(() => ({}));
  const tierId = body?.tier === "pro" ? "pro" : "basic";
  // rinuncia esplicita al recesso 14gg (art. 59 Cod. Consumo)
  const withdrawalWaived = body?.withdrawalWaived === true;
  const priceEnv = TIERS[tierId].priceEnv!;
  const priceId = process.env[priceEnv];
  if (!priceId) {
    return NextResponse.json(
      { error: `Prezzo non configurato per il piano ${TIERS[tierId].name} (${priceEnv})` },
      { status: 501 },
    );
  }

  const stripe = getStripe();
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  // riusa/crea il customer Stripe
  let sub = await db.subscription.findUnique({ where: { userId: session.user.id } });
  let customerId = sub?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      metadata: { userId: session.user.id },
    });
    customerId = customer.id;
    sub = await db.subscription.upsert({
      where: { userId: session.user.id },
      update: { stripeCustomerId: customerId },
      create: { userId: session.user.id, stripeCustomerId: customerId, status: "trialing" },
    });
  }

  // registra la rinuncia esplicita al recesso, se prestata
  if (withdrawalWaived) {
    await db.subscription.update({
      where: { userId: session.user.id },
      data: { withdrawalWaived: true, withdrawalWaivedAt: new Date() },
    });
    try {
      await recordAcceptance(
        session.user.id,
        "withdrawal_waiver",
        LEGAL_VERSIONS.terms,
        req,
      );
    } catch {
      /* non bloccare il checkout */
    }
  }

  // giorni di trial residui -> trial Stripe (così non paga durante la prova)
  const access = await getAccessState(session.user.id);
  const trialDays = access.inTrial && access.trialDaysLeft ? access.trialDaysLeft : undefined;

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: trialDays ? { trial_period_days: trialDays } : undefined,
    success_url: `${appUrl}/billing?success=1`,
    cancel_url: `${appUrl}/billing?canceled=1`,
    metadata: { userId: session.user.id },
  });

  return NextResponse.json({ url: checkout.url });
}
