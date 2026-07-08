import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { profileSchema, type ProfileInput } from "@/lib/validation";

function buildPreferences(p: ProfileInput) {
  const prefs: Record<string, string | number | string[]> = {};
  if (p.daysPerWeek) prefs.daysPerWeek = p.daysPerWeek;
  if (p.otherSports) prefs.otherSports = p.otherSports;
  if (p.crossTraining && p.crossTraining.length)
    prefs.crossTraining = p.crossTraining;
  if (p.llmCount) prefs.llmCount = p.llmCount;
  return Object.keys(prefs).length ? prefs : undefined;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 },
    );
  }
  const p = parsed.data;

  const goals =
    p.goalRaceDistanceKm || p.goalTargetTimeSec || p.goalRaceDate
      ? {
          raceDistanceKm: p.goalRaceDistanceKm ?? null,
          targetTimeSec: p.goalTargetTimeSec ?? null,
          raceDate: p.goalRaceDate ?? null,
        }
      : undefined;

  // preserva llmCount (gestito nelle impostazioni tecniche)
  const existing = await db.athleteProfile.findUnique({
    where: { userId: session.user.id },
  });
  const existingPrefs =
    (existing?.preferences as Record<string, unknown> | null) ?? null;
  const formPrefs = buildPreferences(p) ?? {};
  if (existingPrefs?.llmCount && !("llmCount" in formPrefs)) {
    (formPrefs as Record<string, unknown>).llmCount = existingPrefs.llmCount;
  }
  const preferences = Object.keys(formPrefs).length ? formPrefs : undefined;

  const data = {
    sex: p.sex,
    birthDate: p.birthDate ? new Date(p.birthDate) : undefined,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    restingHr: p.restingHr,
    maxHr: p.maxHr,
    experience: p.experience,
    weeklyVolumeKm: p.weeklyVolumeKm,
    goals,
    preferences,
  };

  await db.athleteProfile.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  return NextResponse.json({ ok: true });
}
