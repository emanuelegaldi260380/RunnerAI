import { auth } from "@/auth";
import { db } from "@/lib/db";
import PlanGenerator from "@/components/PlanGenerator";
import PlanAgenda, {
  type WeekDTO,
  type WorkoutDTO,
  type ActDTO,
} from "@/components/PlanAgenda";
import { fmtDate } from "@/lib/format";
import { isAdminEmail } from "@/lib/admin";
import { t as i18nT } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { daysAgo, nowMs } from "@/lib/time";

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d;
}
function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function PlanPage() {
  const session = await auth();
  const userId = session!.user.id;
  const lang = await getServerLang();
  const tr = (k: string) => i18nT(lang, k);
  const [plan, offRows, profile] = await Promise.all([
    db.trainingPlan.findFirst({
      where: { userId, status: "active" },
      include: { workouts: { orderBy: { date: "asc" } }, proposals: true },
      orderBy: { createdAt: "desc" },
    }),
    db.offDay.findMany({ where: { userId } }),
    db.athleteProfile.findUnique({ where: { userId } }),
  ]);
  const prefs = (profile?.preferences as Record<string, unknown> | null) ?? null;
  const savedPrompt =
    typeof prefs?.customPlanPrompt === "string" ? (prefs.customPlanPrompt as string) : "";

  const offDays = offRows.map((o) => isoDay(o.date));
  const todayISO = isoDay(new Date());

  // aderenza: quota di allenamenti (non-riposo) già scaduti e completati
  let adherence: { done: number; due: number; pct: number } | null = null;
  if (plan) {
    const due = plan.workouts.filter(
      (w) => w.type !== "rest" && isoDay(w.date) < todayISO,
    );
    const done = due.filter((w) => w.completed).length;
    adherence = { done, due: due.length, pct: due.length ? Math.round((done / due.length) * 100) : 0 };
  }

  // allenamenti pianificati per giorno
  const byDay = new Map<string, WorkoutDTO[]>();
  if (plan) {
    for (const w of plan.workouts) {
      const dto: WorkoutDTO = {
        id: w.id,
        dateISO: isoDay(w.date),
        type: w.type,
        title: w.title,
        description: w.description,
        targetDistanceKm: w.targetDistanceKm,
        targetPaceMinSec: w.targetPaceMinSec,
        targetPaceMaxSec: w.targetPaceMaxSec,
        targetHrZone: w.targetHrZone,
        structure: w.structure ?? null,
        exercises: (w.exercises as WorkoutDTO["exercises"]) ?? null,
        completed: w.completed,
      };
      const key = isoDay(w.date);
      (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(dto);
    }
  }

  // finestra: 6 settimane passate → fine piano (o +2 settimane)
  const windowStart = startOfWeekMonday(daysAgo(42));
  const planEndTime = plan?.workouts.length
    ? Math.max(...plan.workouts.map((w) => w.date.getTime()))
    : nowMs();
  const windowEnd = new Date(Math.max(planEndTime, nowMs() + 14 * 86400000));

  // allenamenti SVOLTI per giorno (storico)
  const actRows = await db.activity.findMany({
    where: { userId, date: { gte: windowStart } },
    select: { date: true, type: true, distanceKm: true },
  });
  const actByDay = new Map<string, ActDTO[]>();
  for (const a of actRows) {
    const key = isoDay(a.date);
    (actByDay.get(key) ?? actByDay.set(key, []).get(key)!).push({
      type: a.type,
      distanceKm: a.distanceKm,
    });
  }

  const weeks: WeekDTO[] = [];
  let cursor = new Date(windowStart);
  let index = 0;
  let currentWeekIndex = 0;
  while (cursor <= windowEnd) {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(cursor);
      d.setDate(d.getDate() + i);
      const iso = isoDay(d);
      return {
        dateISO: iso,
        dayNum: d.getDate(),
        workouts: byDay.get(iso) ?? [],
        activities: actByDay.get(iso) ?? [],
      };
    });
    if (days.some((d) => d.dateISO === todayISO)) currentWeekIndex = index;
    weeks.push({
      index,
      startLabel: fmtDate(days[0].dateISO),
      endLabel: fmtDate(days[6].dateISO),
      days,
    });
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
    index++;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{tr("plan.pageTitle")}</h1>
        <p className="text-muted">{tr("plan.pageDesc")}</p>
      </div>

      <PlanGenerator initialPrompt={savedPrompt} hasPlan={!!plan} />

      {plan ? (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold">{plan.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {fmtDate(plan.startDate)} → {fmtDate(plan.endDate)}
          </p>
          {adherence && adherence.due > 0 && (
            <div className="mt-3">
              <div className="mb-0.5 flex justify-between text-sm">
                <span className="font-medium">{tr("plan.adherence")}</span>
                <span className="text-muted">
                  {adherence.done}/{adherence.due} ({adherence.pct}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-brand" style={{ width: `${adherence.pct}%` }} />
              </div>
            </div>
          )}
          {plan.rationale && (
            <p className="mt-3 rounded-lg bg-brand/5 p-3 text-sm">
              <span className="font-medium text-brand">{tr("plan.rationale")}</span>
              {plan.rationale}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
            {plan.proposals.map((p) => (
              <span key={p.id} className="rounded-full border border-border px-2 py-1">
                {p.role === "SUPERVISOR"
                  ? tr("plan.supervisor")
                  : p.role === "PROPOSER_B"
                    ? tr("plan.proposalB")
                    : tr("plan.proposalA")}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="card mb-6 text-muted">{tr("plan.noPlan")}</div>
      )}

      <PlanAgenda
        weeks={weeks}
        offDays={offDays}
        todayISO={todayISO}
        initialWeek={currentWeekIndex}
        isAdmin={isAdminEmail(session!.user.email)}
      />
    </div>
  );
}
