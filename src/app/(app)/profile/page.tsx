import { auth } from "@/auth";
import { db } from "@/lib/db";
import ProfileForm from "@/components/ProfileForm";
import HrZonesForm from "@/components/HrZonesForm";
import DeleteAccount from "@/components/DeleteAccount";
import ProfileTabs from "@/components/ProfileTabs";
import { t as i18nT } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";

export default async function ProfilePage() {
  const session = await auth();
  const lang = await getServerLang();
  const tr = (k: string) => i18nT(lang, k);
  const profile = await db.athleteProfile.findUnique({
    where: { userId: session!.user.id },
  });

  const goals = (profile?.goals as Record<string, unknown> | null) ?? null;
  const prefs = (profile?.preferences as Record<string, unknown> | null) ?? null;

  const initial: Record<string, string> = {
    sex: profile?.sex ?? "",
    birthDate: profile?.birthDate
      ? profile.birthDate.toISOString().slice(0, 10)
      : "",
    heightCm: profile?.heightCm?.toString() ?? "",
    weightKg: profile?.weightKg?.toString() ?? "",
    restingHr: profile?.restingHr?.toString() ?? "",
    maxHr: profile?.maxHr?.toString() ?? "",
    experience: profile?.experience ?? "",
    weeklyVolumeKm: profile?.weeklyVolumeKm?.toString() ?? "",
    daysPerWeek: prefs?.daysPerWeek?.toString() ?? "",
    goalRaceDistanceKm: goals?.raceDistanceKm?.toString() ?? "",
    goalTargetTimeSec: goals?.targetTimeSec?.toString() ?? "",
    goalRaceDate: goals?.raceDate?.toString()?.slice(0, 10) ?? "",
    otherSports: (prefs?.otherSports as string) ?? "",
    llmCount: prefs?.llmCount?.toString() ?? "",
  };

  const initialCross = Array.isArray(prefs?.crossTraining)
    ? (prefs!.crossTraining as string[])
    : [];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold">{tr("an.profile")}</h1>
      <ProfileTabs />
      <p className="mb-6 text-muted">{tr("prof.pageDesc")}</p>
      <ProfileForm initial={initial} initialCross={initialCross} />

      <div className="mt-6">
        <HrZonesForm
          initial={
            (profile?.hrZones as Partial<
              Record<"z1" | "z2" | "z3" | "z4" | "z5", { min?: number; max?: number }>
            > | null) ?? null
          }
          maxHr={profile?.maxHr ?? null}
        />
      </div>

      <div className="mt-10 space-y-4">
        <div className="card">
          <h3 className="mb-1 font-semibold">{tr("prof.exportTitle")}</h3>
          <p className="mb-3 text-sm text-muted">{tr("prof.exportDesc")}</p>
          <a href="/api/account/export" className="btn-ghost" download>
            {tr("prof.exportBtn")}
          </a>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-bold text-red-500">{tr("prof.dangerZone")}</h2>
          <DeleteAccount />
        </div>
      </div>
    </div>
  );
}
