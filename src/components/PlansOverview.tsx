import { TIERS } from "@/lib/plans";
import { t } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";

/**
 * Riepilogo dei piani (presentational, server-safe). Usato in registrazione
 * e come confronto pubblico.
 */
export default async function PlansOverview({ compact = false }: { compact?: boolean }) {
  const lang = await getServerLang();
  const tr = (k: string) => t(lang, k);
  const order = ["trial", "basic", "pro"] as const;
  return (
    <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-3"}`}>
      {order.map((id) => {
        const tier = TIERS[id];
        return (
          <div
            key={id}
            className={`rounded-xl border p-4 ${
              id === "pro" ? "border-brand bg-brand/5" : "border-border bg-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold">{tr(tier.nameKey)}</h4>
              {id === "pro" && <span className="chip !text-xs">{tr("po.top")}</span>}
            </div>
            <div className="mt-1 text-lg font-extrabold">{tr(tier.priceKey)}</div>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              <li>✓ {tier.monthlyPlans} {tr("po.plansPerMonth")}</li>
              <li>✓ {tier.monthlyIngests} {tr("po.ingestsPerMonth")}</li>
              {tier.featureKeys.slice(2).map((k) => (
                <li key={k}>✓ {tr(k)}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
