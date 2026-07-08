import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import AdminUpgrade from "@/components/AdminUpgrade";
import { t as i18nT } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { titleMeta } from "@/lib/pageMeta";

export const generateMetadata = () => titleMeta("an.admin");
import { daysAgo, nowMs } from "@/lib/time";

function fmt(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString("it-IT");
}

// stima costo (USD per 1M token) — approssimativa, per orientamento
const RATE_PER_M: Record<string, { in: number; out: number }> = {
  claude: { in: 5, out: 25 },
  openai: { in: 2.5, out: 10 },
  deepseek: { in: 0.3, out: 1.2 },
};

export default async function AdminPage() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/dashboard");
  const lang = await getServerLang();
  const tr = (k: string) => i18nT(lang, k);

  const since7 = daysAgo(7);
  const since30 = daysAgo(30);
  const since14 = daysAgo(14);

  const [total, a7, a30, byProvider, byModel, byOp, recentRows] =
    await Promise.all([
      db.tokenUsage.aggregate({ _sum: { totalTokens: true }, _count: true }),
      db.tokenUsage.aggregate({ where: { createdAt: { gte: since7 } }, _sum: { totalTokens: true } }),
      db.tokenUsage.aggregate({ where: { createdAt: { gte: since30 } }, _sum: { totalTokens: true } }),
      db.tokenUsage.groupBy({
        by: ["provider"],
        _sum: { totalTokens: true, promptTokens: true, completionTokens: true },
        _count: true,
      }),
      db.tokenUsage.groupBy({
        by: ["model"],
        _sum: { totalTokens: true },
        _count: true,
      }),
      db.tokenUsage.groupBy({
        by: ["operation"],
        _sum: { totalTokens: true },
        _count: true,
      }),
      db.tokenUsage.findMany({
        where: { createdAt: { gte: since14 } },
        select: { createdAt: true, totalTokens: true },
      }),
    ]);

  // andamento giornaliero (ultimi 14 giorni)
  const daily = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(nowMs() - i * 86400000).toISOString().slice(0, 10);
    daily.set(d, 0);
  }
  for (const r of recentRows) {
    const d = r.createdAt.toISOString().slice(0, 10);
    if (daily.has(d)) daily.set(d, daily.get(d)! + r.totalTokens);
  }
  const dailyArr = [...daily.entries()];
  const maxDaily = Math.max(1, ...dailyArr.map(([, v]) => v));

  // stima costo totale
  let costEstimate = 0;
  for (const p of byProvider) {
    const rate = RATE_PER_M[p.provider];
    if (rate) {
      costEstimate +=
        ((p._sum.promptTokens ?? 0) / 1_000_000) * rate.in +
        ((p._sum.completionTokens ?? 0) / 1_000_000) * rate.out;
    }
  }

  const cards = [
    { label: tr("admin.totalTokens"), value: fmt(total._sum.totalTokens) },
    { label: tr("admin.last7"), value: fmt(a7._sum.totalTokens) },
    { label: tr("admin.last30"), value: fmt(a30._sum.totalTokens) },
    { label: tr("admin.totalCalls"), value: fmt(total._count) },
    { label: tr("admin.costEstimate"), value: "$" + costEstimate.toFixed(2) },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold">{tr("admin.title")}</h1>
      <p className="mb-6 text-muted">{tr("admin.desc")}</p>

      <div className="mb-8">
        <AdminUpgrade />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <div className="text-xl font-bold">{c.value}</div>
            <div className="text-xs text-muted">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Andamento giornaliero */}
      <div className="card mb-8">
        <h2 className="mb-4 font-semibold">{tr("admin.tokensPerDay")}</h2>
        <div className="flex h-40 items-end gap-1">
          {dailyArr.map(([d, v]) => (
            <div key={d} className="flex flex-1 flex-col items-center gap-1" title={`${d}: ${fmt(v)}`}>
              <div
                className="w-full rounded-t bg-brand/70"
                style={{ height: `${(v / maxDaily) * 100}%`, minHeight: v > 0 ? "2px" : "0" }}
              />
              <span className="text-[9px] text-muted">{d.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Breakdown title={tr("admin.byProvider")} rows={byProvider.map((p) => ({ k: p.provider, v: p._sum.totalTokens ?? 0, c: p._count }))} noData={tr("admin.noData")} />
        <Breakdown title={tr("admin.byModel")} rows={byModel.map((m) => ({ k: m.model, v: m._sum.totalTokens ?? 0, c: m._count }))} noData={tr("admin.noData")} />
        <Breakdown title={tr("admin.byOperation")} rows={byOp.map((o) => ({ k: o.operation, v: o._sum.totalTokens ?? 0, c: o._count }))} noData={tr("admin.noData")} />
      </div>
    </div>
  );
}

function Breakdown({
  title,
  rows,
  noData,
}: {
  title: string;
  rows: { k: string; v: number; c: number }[];
  noData: string;
}) {
  const sorted = [...rows].sort((a, b) => b.v - a.v);
  const max = Math.max(1, ...sorted.map((r) => r.v));
  return (
    <div className="card">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted">{noData}</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((r) => (
            <div key={r.k}>
              <div className="mb-0.5 flex justify-between text-sm">
                <span className="font-medium">{r.k}</span>
                <span className="text-muted">{fmt(r.v)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-brand" style={{ width: `${(r.v / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
