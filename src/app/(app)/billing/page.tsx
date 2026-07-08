import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessState } from "@/lib/subscription";
import { stripeConfigured } from "@/lib/stripe";
import { resolveUserTier, getMonthlyUsage, TIERS } from "@/lib/plans";
import BillingActions from "@/components/BillingActions";
import SubscribeButton from "@/components/SubscribeButton";
import { fmtDate } from "@/lib/format";
import { t as i18nT } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { titleMeta } from "@/lib/pageMeta";

export const generateMetadata = () => titleMeta("an.billing");

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, (used / (limit || 1)) * 100);
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-sm">
        <span>{label}</span>
        <span className={used >= limit ? "font-semibold text-red-500" : "text-muted"}>
          {used}/{limit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full rounded-full ${used >= limit ? "bg-red-500" : "bg-brand"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function BillingPage() {
  const session = await auth();
  const userId = session!.user.id;
  const lang = await getServerLang();
  const tr = (k: string) => i18nT(lang, k);
  const [access, sub, { tier, def }, usage] = await Promise.all([
    getAccessState(userId),
    db.subscription.findUnique({ where: { userId } }),
    resolveUserTier(userId),
    getMonthlyUsage(userId),
  ]);
  const statusLabels: Record<string, string> = {
    trialing: tr("bill.stTrialing"),
    active: tr("bill.stActive"),
    past_due: tr("bill.stPastDue"),
    canceled: tr("bill.stCanceled"),
    incomplete: tr("bill.stIncomplete"),
    none: tr("bill.stNone"),
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold">{tr("an.billing")}</h1>
      <p className="mb-6 text-muted">{tr("bill.desc")}</p>

      {/* Stato + uso mensile */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted">{tr("bill.currentPlan")}</div>
            <div className="text-lg font-semibold">
              {def ? tr(def.nameKey) : statusLabels[access.status] ?? access.status}
            </div>
          </div>
          <div className="text-right">
            {access.inTrial ? (
              <>
                <div className="text-sm text-muted">{tr("bill.trial")}</div>
                <div className="text-lg font-semibold text-brand">
                  {access.trialDaysLeft} {tr("bill.daysLeft")}
                </div>
              </>
            ) : sub?.currentPeriodEnd ? (
              <>
                <div className="text-sm text-muted">{tr("bill.renewal")}</div>
                <div className="text-lg font-semibold">{fmtDate(sub.currentPeriodEnd)}</div>
              </>
            ) : null}
          </div>
        </div>

        {def && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <UsageBar label={tr("bill.usagePlans")} used={usage.plans} limit={def.monthlyPlans} />
            <UsageBar label={tr("bill.usageIngests")} used={usage.ingests} limit={def.monthlyIngests} />
          </div>
        )}
      </div>

      {/* Piani */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(["basic", "pro"] as const).map((id) => {
          const t = TIERS[id];
          const isCurrent = tier === id;
          return (
            <div key={id} className={`card ${id === "pro" ? "border-brand" : ""}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{tr(t.nameKey)}</h3>
                {id === "pro" && <span className="chip !text-xs">{tr("bill.recommended")}</span>}
              </div>
              <div className="mt-1 text-2xl font-extrabold">{tr(t.priceKey)}</div>
              <ul className="mt-3 space-y-1 text-sm text-muted">
                {t.featureKeys.map((k) => (
                  <li key={k}>✓ {tr(k)}</li>
                ))}
              </ul>
              <div className="mt-4">
                {!stripeConfigured() ? (
                  <p className="text-xs text-muted">
                    {tr("bill.stripeNot")} ({t.priceEnv}).
                  </p>
                ) : isCurrent ? (
                  <div className="rounded-lg bg-brand/10 py-2 text-center text-sm font-medium text-brand">
                    {tr("bill.currentPlan")}
                  </div>
                ) : (
                  <SubscribeButton
                    tier={id}
                    planName={tr(t.nameKey)}
                    priceLabel={tr(t.priceKey)}
                    variant={id === "pro" ? "brand" : "ghost"}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gestione */}
      {sub?.stripeSubscriptionId && (
        <div className="card mt-6">
          <h3 className="mb-3 font-semibold">{tr("bill.manageTitle")}</h3>
          <BillingActions
            configured={stripeConfigured()}
            hasSubscription
            cancelAtPeriodEnd={sub.cancelAtPeriodEnd}
          />
        </div>
      )}
    </div>
  );
}
