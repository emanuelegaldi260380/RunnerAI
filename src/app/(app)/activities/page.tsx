import { auth } from "@/auth";
import { db } from "@/lib/db";
import UploadActivity from "@/components/UploadActivity";
import ActivityCharts, { type ActivityPoint } from "@/components/ActivityCharts";
import AutopsyPanel, {
  type AutopsyCandidate,
  type AutopsyDTO,
} from "@/components/AutopsyPanel";
import {
  fmtDate,
  fmtDistance,
  fmtDuration,
  fmtPace,
  typeLabel,
} from "@/lib/format";
import { t } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";

export default async function ActivitiesPage() {
  const session = await auth();
  const lang = await getServerLang();
  const tr = (k: string) => t(lang, k);
  const activities = await db.activity.findMany({
    where: { userId: session!.user.id },
    orderBy: { date: "desc" },
    take: 100,
  });

  const assessed = activities.filter((a) => a.aiAssessment).slice(0, 5);

  // Autopsia (Modulo 1): candidate = gare e sedute chiave/lunghe con dati sufficienti.
  const candidateActivities = activities
    .filter(
      (a) =>
        a.type === "race" ||
        (a.durationSec ?? 0) >= 40 * 60 ||
        (a.distanceKm ?? 0) >= 10,
    )
    .slice(0, 15);
  const autopsies = candidateActivities.length
    ? await db.performanceAutopsy.findMany({
        where: {
          userId: session!.user.id,
          activityId: { in: candidateActivities.map((a) => a.id) },
        },
      })
    : [];
  const autopsyByActivity = new Map(autopsies.map((a) => [a.activityId, a]));
  const autopsyCandidates: AutopsyCandidate[] = candidateActivities.map((a) => {
    const row = autopsyByActivity.get(a.id);
    return {
      id: a.id,
      label: `${fmtDate(a.date)} · ${typeLabel(a.type)} · ${fmtDistance(a.distanceKm)}`,
      autopsy: row
        ? ({
            headline: row.headline,
            summary: row.summary,
            pacingAnalysis: row.pacingAnalysis,
            lessons: (row.lessons as string[] | null) ?? null,
            executionScore: row.executionScore,
            positiveSplitPct: row.positiveSplitPct,
            fadePct: row.fadePct,
            hrDriftPct: row.hrDriftPct,
            paceCvPct: row.paceCvPct,
          } satisfies AutopsyDTO)
        : null,
    };
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold">{tr("an.activities")}</h1>
      <p className="mb-6 text-muted">{tr("act.pageDesc")}</p>

      <div className="mb-8">
        <UploadActivity />
      </div>

      {activities.length >= 2 && (
        <div className="mb-8">
          <ActivityCharts
            activities={activities.map<ActivityPoint>((a) => ({
              date: a.date.toISOString(),
              distanceKm: a.distanceKm,
              durationSec: a.durationSec,
              avgPaceSecPerKm: a.avgPaceSecPerKm,
              avgHr: a.avgHr,
              maxHr: a.maxHr,
              elevationGainM: a.elevationGainM,
              cadence: a.cadence,
              calories: a.calories,
            }))}
          />
        </div>
      )}

      {/* Autopsia post-performance (Modulo 1) */}
      {autopsyCandidates.length > 0 && (
        <div className="mb-8">
          <AutopsyPanel candidates={autopsyCandidates} />
        </div>
      )}

      {/* Giudizio dell'AI sugli allenamenti */}
      {assessed.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-1 text-lg font-semibold">{tr("assess.sectionTitle")}</h2>
          <p className="mb-3 text-sm text-muted">{tr("assess.sectionDesc")}</p>
          <div className="space-y-3">
            {assessed.map((a) => (
              <div key={a.id} className="card">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">
                    {fmtDate(a.date)} · {typeLabel(a.type)}
                  </span>
                  {a.aiRating && (
                    <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                      {a.aiRating}
                    </span>
                  )}
                </div>
                <p className="text-sm">{a.aiAssessment}</p>
                {a.aiPlanAdvice && (
                  <p className="mt-2 text-sm text-muted">
                    <span className="font-medium text-foreground">
                      {tr("assess.planAdvice")}
                    </span>{" "}
                    {a.aiPlanAdvice}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">
        {tr("act.history")} ({activities.length})
      </h2>
      {activities.length === 0 ? (
        <div className="card text-muted">{tr("act.empty")}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-left text-muted dark:bg-white/5">
              <tr>
                <th className="px-4 py-2">{tr("act.thDate")}</th>
                <th className="px-4 py-2">{tr("act.thType")}</th>
                <th className="px-4 py-2">{tr("act.thDistance")}</th>
                <th className="px-4 py-2">{tr("act.thDuration")}</th>
                <th className="px-4 py-2">{tr("act.thPace")}</th>
                <th className="px-4 py-2">{tr("act.thAvgHr")}</th>
                <th className="px-4 py-2">{tr("act.thElevation")}</th>
                <th className="px-4 py-2">{tr("act.thRating")}</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-2">{fmtDate(a.date)}</td>
                  <td className="px-4 py-2">{typeLabel(a.type)}</td>
                  <td className="px-4 py-2">{fmtDistance(a.distanceKm)}</td>
                  <td className="px-4 py-2">{fmtDuration(a.durationSec)}</td>
                  <td className="px-4 py-2">{fmtPace(a.avgPaceSecPerKm)}</td>
                  <td className="px-4 py-2">{a.avgHr ?? "—"}</td>
                  <td className="px-4 py-2">
                    {a.elevationGainM != null ? `${a.elevationGainM} m` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {a.aiRating ? (
                      <span
                        title={a.aiAssessment ?? undefined}
                        className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand"
                      >
                        {a.aiRating}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
