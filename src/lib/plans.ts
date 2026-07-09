import { db } from "@/lib/db";

export type TierId = "trial" | "basic" | "pro" | "none";

export interface Tier {
  id: TierId;
  /** nome in italiano (fallback interno / messaggi server non localizzati) */
  name: string;
  /** prezzo in italiano (fallback interno) */
  priceLabel: string;
  /** chiave i18n del nome piano (per la UI localizzata) */
  nameKey: string;
  /** chiave i18n del prezzo (per la UI localizzata) */
  priceKey: string;
  /** limite mensile di generazioni/aggiornamenti del piano (richieste AI intensive) */
  monthlyPlans: number;
  /** limite mensile di analisi screenshot */
  monthlyIngests: number;
  /** numero massimo di LLM utilizzabili per generare il piano */
  maxLlms: number;
  /** chiavi i18n delle caratteristiche (in ordine); le prime 2 sono i conteggi piani/analisi */
  featureKeys: string[];
  /** env che contiene lo Stripe price id (per basic/pro) */
  priceEnv?: string;
}

export const TIERS: Record<Exclude<TierId, "none">, Tier> = {
  trial: {
    id: "trial",
    name: "Prova",
    priceLabel: "Gratis · 14 giorni",
    nameKey: "tier.trial.name",
    priceKey: "tier.trial.price",
    // free trial più limitato: assaggio del prodotto
    monthlyPlans: 2,
    monthlyIngests: 8,
    maxLlms: 1,
    featureKeys: ["tier.trial.f1", "tier.trial.f2", "tier.trial.f3"],
  },
  basic: {
    id: "basic",
    name: "Base",
    priceLabel: "€9,99 / mese",
    nameKey: "tier.basic.name",
    priceKey: "tier.basic.price",
    monthlyPlans: 8,
    monthlyIngests: 60,
    maxLlms: 2,
    featureKeys: [
      "tier.basic.f1",
      "tier.basic.f2",
      "tier.basic.f3",
      "tier.basic.f4",
    ],
    priceEnv: "STRIPE_PRICE_ID",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "€24,99 / mese",
    nameKey: "tier.pro.name",
    priceKey: "tier.pro.price",
    monthlyPlans: 40,
    monthlyIngests: 300,
    maxLlms: 3,
    featureKeys: [
      "tier.pro.f1",
      "tier.pro.f2",
      "tier.pro.f3",
      "tier.pro.f4",
      "tier.pro.f5",
    ],
    priceEnv: "STRIPE_PRICE_ID_PRO",
  },
};

/** Mappa uno Stripe price id al tier corrispondente */
export function tierForPriceId(priceId: string | null | undefined): TierId {
  if (!priceId) return "none";
  if (process.env.STRIPE_PRICE_ID_PRO && priceId === process.env.STRIPE_PRICE_ID_PRO)
    return "pro";
  if (process.env.STRIPE_PRICE_ID && priceId === process.env.STRIPE_PRICE_ID)
    return "basic";
  return "none";
}

export interface ResolvedTier {
  tier: TierId;
  def: Tier | null;
}

/** Determina il tier attivo dell'utente (trial / basic / pro / none) */
export async function resolveUserTier(userId: string): Promise<ResolvedTier> {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub) return { tier: "none", def: null };

  // override admin
  if (sub.forcedTier && sub.forcedTier in TIERS) {
    const t = sub.forcedTier as Exclude<TierId, "none">;
    return { tier: t, def: TIERS[t] };
  }

  const now = Date.now();
  const inTrial =
    sub.status === "trialing" &&
    !!sub.trialEndsAt &&
    sub.trialEndsAt.getTime() > now;
  if (sub.status === "active") {
    const t = tierForPriceId(sub.stripePriceId);
    if (t !== "none") return { tier: t, def: TIERS[t] };
    return { tier: "basic", def: TIERS.basic }; // attivo senza price mappato -> base
  }
  if (inTrial) return { tier: "trial", def: TIERS.trial };
  return { tier: "none", def: null };
}

/** Numero di LLM effettivo: preferenza utente limitata dal tetto del tier. */
export async function effectiveLlmCount(
  userId: string,
  requested?: number | null,
): Promise<{ count: number; max: number }> {
  const { def } = await resolveUserTier(userId);
  const max = def?.maxLlms ?? 1;
  const req = requested && requested > 0 ? requested : max;
  return { count: Math.max(1, Math.min(req, max)), max };
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export interface LimitState {
  allowed: boolean;
  used: number;
  limit: number;
  tier: TierId;
}

/** Verifica il limite mensile per un'azione AI ("plan" | "ingest") */
export async function checkLimit(
  userId: string,
  action: "plan" | "ingest",
): Promise<LimitState> {
  const { tier, def } = await resolveUserTier(userId);
  if (!def) return { allowed: false, used: 0, limit: 0, tier };

  // BYOK: chi usa la propria chiave non ha limiti sulla generazione piano
  if (action === "plan") {
    const own = await db.userLlmConfig.findUnique({ where: { userId } });
    if (own?.enabled && own.apiKeyEnc) {
      return { allowed: true, used: 0, limit: Infinity, tier };
    }
  }

  const since = startOfMonth();
  const used =
    action === "plan"
      ? await db.trainingPlan.count({ where: { userId, createdAt: { gte: since } } })
      : await db.activity.count({
          where: { userId, source: "SCREENSHOT", createdAt: { gte: since } },
        });
  const limit = action === "plan" ? def.monthlyPlans : def.monthlyIngests;
  return { allowed: used < limit, used, limit, tier };
}

/** Uso mensile corrente per la dashboard/billing */
export async function getMonthlyUsage(userId: string) {
  const since = startOfMonth();
  const [plans, ingests] = await Promise.all([
    db.trainingPlan.count({ where: { userId, createdAt: { gte: since } } }),
    db.activity.count({
      where: { userId, source: "SCREENSHOT", createdAt: { gte: since } },
    }),
  ]);
  return { plans, ingests };
}
