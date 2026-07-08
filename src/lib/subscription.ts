import { db } from "./db";

export const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || "14", 10);

export interface AccessState {
  hasAccess: boolean;
  status: string;
  inTrial: boolean;
  trialDaysLeft: number | null;
  trialEndsAt: Date | null;
}

/** Crea l'abbonamento in trial per un nuovo utente */
export async function createTrialSubscription(userId: string) {
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  return db.subscription.create({
    data: {
      userId,
      status: "trialing",
      trialEndsAt,
    },
  });
}

/** Determina se l'utente ha accesso alle feature premium */
export async function getAccessState(userId: string): Promise<AccessState> {
  const sub = await db.subscription.findUnique({ where: { userId } });
  const now = Date.now();

  if (!sub) {
    return {
      hasAccess: false,
      status: "none",
      inTrial: false,
      trialDaysLeft: null,
      trialEndsAt: null,
    };
  }

  const trialEndsAt = sub.trialEndsAt;
  const inTrial =
    sub.status === "trialing" && !!trialEndsAt && trialEndsAt.getTime() > now;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now) / (24 * 60 * 60 * 1000)))
    : null;

  const activeStatuses = ["active", "trialing"];
  const periodOk =
    sub.status === "active"
      ? !sub.currentPeriodEnd || sub.currentPeriodEnd.getTime() > now
      : true;

  const hasAccess =
    !!sub.forcedTier || // override admin
    (sub.status === "trialing" && inTrial) ||
    (sub.status === "active" && periodOk) ||
    (activeStatuses.includes(sub.status) && inTrial);

  return {
    hasAccess,
    status: sub.status,
    inTrial,
    trialDaysLeft,
    trialEndsAt,
  };
}
