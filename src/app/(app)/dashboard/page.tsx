import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import RunAgentButton from "@/components/RunAgentButton";
import GeneratePlanButton from "@/components/GeneratePlanButton";
import SubjectiveLogForm from "@/components/SubjectiveLogForm";
import SubjectiveInsightsCard from "@/components/SubjectiveInsightsCard";
import PhysiologyCard, { type PhysioDTO } from "@/components/PhysiologyCard";
import RaceGoals, { type Race } from "@/components/RaceGoals";
import Icon from "@/components/Icon";
import { isAdminEmail } from "@/lib/admin";
import { computePersonalBests } from "@/lib/services/personalBests";
import { fmtDate, fmtDistance, fmtDuration, fmtPace, typeLabel } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { titleMeta } from "@/lib/pageMeta";

export const generateMetadata = () => titleMeta("nav.dashboard");
import { daysAgo } from "@/lib/time";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const lang = await getServerLang();
  const tt = (k: string) => t(lang, k);

  const [
    activityCount,
    lastActivity,
    plan,
    kbCount,
    raceRows,
    weekKm,
    profile,
    integrationCount,
  ] = await Promise.all([
      db.activity.count({ where: { userId } }),
      db.activity.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
      db.trainingPlan.findFirst({
        where: { userId, status: "active" },
        include: { workouts: { orderBy: { date: "asc" } } },
        orderBy: { createdAt: "desc" },
      }),
      db.scientificSource.count(),
      db.raceGoal.findMany({
        where: { userId, status: "planned" },
        orderBy: [{ raceDate: "asc" }, { priority: "asc" }],
      }),
      db.activity.aggregate({
        where: { userId, date: { gte: daysAgo(7) } },
        _sum: { distanceKm: true },
      }),
      db.athleteProfile.findUnique({ where: { userId } }),
      db.integrationConnection.count({ where: { userId } }),
    ]);

  const physiology = await db.physiologyProfile.findUnique({ where: { userId } });
  const physioDTO: PhysioDTO | null = physiology
    ? {
        lthrBpm: physiology.lthrBpm,
        thresholdPaceSecPerKm: physiology.thresholdPaceSecPerKm,
        maxHrEst: physiology.maxHrEst,
        restingHrEst: physiology.restingHrEst,
        vo2max: physiology.vo2max,
        hrZones: physiology.hrZones as PhysioDTO["hrZones"],
        decouplingPct: physiology.decouplingPct,
        durabilityPct: physiology.durabilityPct,
        heatSecPerKmPerC: physiology.heatSecPerKmPerC,
        baselineHrvMs: physiology.baselineHrvMs,
        sampleActivities: physiology.sampleActivities,
        confidence: physiology.confidence,
        notes: physiology.notes,
      }
    : null;

  const steps: {
    done: boolean;
    label: string;
    href: string;
    optional?: boolean;
  }[] = [
    { done: !!profile?.experience, label: tt("d.s1"), href: "/profile" },
    { done: raceRows.length > 0, label: tt("d.s2"), href: "/dashboard" },
    { done: activityCount > 0, label: tt("d.s3"), href: "/activities" },
    {
      done: integrationCount > 0,
      label: `${tt("d.sConnect")} (${tt("d.sConnectOpt")})`,
      href: "/integrations",
      optional: true,
    },
    { done: !!plan, label: tt("d.s4"), href: "/plan" },
  ];
  const onboardingDone = steps.filter((s) => !s.optional).every((s) => s.done);

  const pbs = await computePersonalBests(userId);

  const races: Race[] = raceRows.map((r) => ({
    id: r.id,
    name: r.name,
    distanceKm: r.distanceKm,
    raceDate: r.raceDate ? r.raceDate.toISOString() : null,
    targetTimeSec: r.targetTimeSec,
    priority: r.priority,
  }));

  const today = new Date().toISOString().slice(0, 10);
  const todayWorkout = plan?.workouts.find((w) => w.date.toISOString().slice(0, 10) === today);
  const nextWorkout = plan?.workouts.find((w) => w.date.toISOString().slice(0, 10) >= today) ?? null;

  const stats = [
    { label: tt("d.stActivities"), value: activityCount },
    { label: tt("d.stWeek"), value: (weekKm._sum.distanceKm ?? 0).toFixed(1) },
    { label: tt("d.stKb"), value: kbCount },
    { label: tt("d.stRaces"), value: races.length },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      {/* Hero banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/run2.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
        <div className="relative px-6 py-10 sm:px-8 sm:py-14">
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
            {tt("d.hi")}, {session!.user.name ?? "runner"} 👋
          </h1>
          <p className="mt-2 max-w-lg text-white/85">{tt("d.subtitle")}</p>
        </div>
      </div>

      {!onboardingDone && (
        <div className="card mb-8 border-brand/40">
          <h2 className="mb-1 font-semibold">{tt("d.start")}</h2>
          <p className="mb-3 text-sm text-muted">{tt("d.startSub")}</p>
          <ul className="space-y-2">
            {steps.map((s) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  className={`flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm transition hover:border-brand ${
                    s.done ? "text-muted" : "font-medium"
                  }`}
                >
                  <span className={s.done ? "text-green-600" : "text-brand"}>
                    {s.done ? "✓" : "○"}
                  </span>
                  <span className={s.done ? "line-through" : ""}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <RaceGoals races={races} />
      </div>

      {pbs.length > 0 && (
        <div className="card mb-8">
          <h2 className="mb-1 font-semibold">{tt("d.pbTitle")}</h2>
          <p className="mb-3 text-sm text-muted">{tt("d.pbDesc")}</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {pbs.map((pb) => (
              <div key={pb.label} className="rounded-lg border border-border p-3">
                <div className="text-xs text-muted">{pb.label}</div>
                <div className="text-lg font-bold">{fmtDuration(pb.timeSec)}</div>
                <div className="text-xs text-muted">{fmtDate(pb.date)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Allenamento di oggi */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex gap-4 p-5">
            <div className="flex-1">
              <h2 className="mb-3 font-semibold">{tt("d.todayTitle")}</h2>
              {todayWorkout ? (
                <div>
                  <div className="font-medium">
                    {todayWorkout.title ?? typeLabel(todayWorkout.type)}
                  </div>
                  <p className="mt-1 text-sm text-muted">{todayWorkout.description}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                    {todayWorkout.targetDistanceKm != null && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="target" size={14} /> {fmtDistance(todayWorkout.targetDistanceKm)}
                      </span>
                    )}
                    {todayWorkout.targetPaceMinSec != null && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="timer" size={14} /> {fmtPace(todayWorkout.targetPaceMinSec)}
                      </span>
                    )}
                    {todayWorkout.targetHrZone && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="heart" size={14} /> {todayWorkout.targetHrZone}
                      </span>
                    )}
                  </div>
                </div>
              ) : nextWorkout ? (
                <p className="text-sm text-muted">
                  {tt("d.next")} <b>{nextWorkout.title ?? typeLabel(nextWorkout.type)}</b> ·{" "}
                  {fmtDate(nextWorkout.date)}
                </p>
              ) : (
                <div className="text-sm text-muted">
                  <p className="mb-3">{tt("d.todayNone")}</p>
                  <GeneratePlanButton />
                </div>
              )}
              <div className="mt-4">
                <Link href="/plan" className="text-sm text-brand hover:underline">
                  {tt("d.seePlan")}
                </Link>
              </div>
            </div>
            <div
              className="hidden w-24 shrink-0 self-stretch rounded-lg bg-cover bg-center sm:block"
              style={{ backgroundImage: "url('/images/hero.jpg')" }}
            />
          </div>
        </div>

        {/* Ultimo allenamento */}
        <div className="card">
          <h2 className="mb-3 font-semibold">{tt("d.lastTitle")}</h2>
          {lastActivity ? (
            <div>
              <div className="font-medium">
                {typeLabel(lastActivity.type)} · {fmtDate(lastActivity.date)}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted">
                <span>{fmtDistance(lastActivity.distanceKm)}</span>
                <span>{fmtPace(lastActivity.avgPaceSecPerKm)}</span>
                {lastActivity.avgHr && (
                  <span className="inline-flex items-center gap-1">
                    <Icon name="heart" size={14} /> {lastActivity.avgHr} bpm
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">
              {tt("d.lastNone")}{" "}
              <Link href="/activities" className="text-brand hover:underline">
                {tt("d.loadFirst")}
              </Link>
              .
            </p>
          )}
        </div>
      </div>

      {/* Gemello fisiologico (Modulo 2) */}
      <div className="mt-6">
        <PhysiologyCard initial={physioDTO} />
      </div>

      {/* Log soggettivo + mappatura (Modulo 4) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SubjectiveLogForm />
        <SubjectiveInsightsCard />
      </div>

      {/* Base scientifica */}
      <div className="card mt-6">
        <h2 className="mb-1 font-semibold">{tt("d.scienceTitle")}</h2>
        <p className="mb-3 text-sm text-muted">
          {tt("d.scienceDesc")} ({kbCount} {tt("d.scienceNightly")}
        </p>
        {isAdminEmail(session!.user.email) && (
          <RunAgentButton
            endpoint="/api/cron/research"
            label="Aggiorna base scientifica (admin)"
            runningLabel="…"
          />
        )}
      </div>
    </div>
  );
}
