import { db } from "@/lib/db";
import { getUserTextProvider } from "@/lib/llm/userProvider";

const LANG_NAME: Record<string, string> = {
  it: "italiano",
  en: "inglese",
  es: "spagnolo",
};

export interface ActivityAssessment {
  rating: string; // ottimo | buono | sufficiente | scarso
  assessment: string; // giudizio di merito (2-4 frasi)
  planAdvice: string; // come rivedere il piano
}

/**
 * L'AI dà un giudizio di merito su un allenamento svolto (da screenshot,
 * Garmin o Strava), confrontandolo con il workout pianificato e con la gara
 * obiettivo, e suggerisce come rivedere il piano. Salva il risultato
 * sull'attività. Rispetta la scelta BYOK dell'utente.
 */
export async function assessActivity(
  userId: string,
  activityId: string,
  lang = "it",
): Promise<ActivityAssessment | null> {
  const activity = await db.activity.findFirst({
    where: { id: activityId, userId },
    include: { plannedWorkout: true },
  });
  if (!activity) return null;

  const prov = await getUserTextProvider(userId);
  if (!prov) return null;

  const goal = await db.raceGoal.findFirst({
    where: { userId },
    orderBy: { raceDate: "asc" },
  });

  const done = {
    tipo: activity.type,
    data: activity.date.toISOString().slice(0, 10),
    distanceKm: activity.distanceKm,
    durationSec: activity.durationSec,
    avgPaceSecPerKm: activity.avgPaceSecPerKm,
    avgHr: activity.avgHr,
    maxHr: activity.maxHr,
    elevationGainM: activity.elevationGainM,
    cadence: activity.cadence,
    splits: activity.splits,
  };
  const planned = activity.plannedWorkout
    ? {
        title: activity.plannedWorkout.title,
        type: activity.plannedWorkout.type,
        description: activity.plannedWorkout.description,
      }
    : null;
  const goalCtx = goal
    ? { name: goal.name, distanceKm: goal.distanceKm, raceDate: goal.raceDate }
    : null;

  const langName = LANG_NAME[lang] ?? lang;
  const sys =
    "Sei un coach di corsa esperto. Valuti un singolo allenamento svolto rispetto a quanto pianificato e agli obiettivi dell'atleta. Sii concreto, tecnico e incoraggiante. Rispondi SOLO con JSON valido.";
  const user =
    `Allenamento svolto:\n${JSON.stringify(done)}\n\n` +
    `Allenamento pianificato per quel giorno (se presente):\n${JSON.stringify(planned)}\n\n` +
    `Gara obiettivo principale:\n${JSON.stringify(goalCtx)}\n\n` +
    `Dai un giudizio di merito su quanto fatto. Scrivi TUTTI i testi in ${langName}.\n` +
    `Rispondi con JSON: { "rating": "ottimo|buono|sufficiente|scarso" (tradotto in ${langName}), ` +
    `"assessment": "2-4 frasi di giudizio sull'esecuzione rispetto al piano e agli obiettivi", ` +
    `"planAdvice": "1-2 frasi su come rivedere/adattare il piano dei prossimi giorni" }`;

  try {
    const out = await prov.chatJSON<ActivityAssessment>({
      system: sys,
      messages: [{ role: "user", content: user }],
      maxTokens: 600,
    });
    const rating = String(out?.rating ?? "").slice(0, 24);
    const assessment = String(out?.assessment ?? "").slice(0, 1200);
    const planAdvice = String(out?.planAdvice ?? "").slice(0, 600);
    if (!assessment) return null;
    await db.activity.update({
      where: { id: activityId },
      data: { aiRating: rating, aiAssessment: assessment, aiPlanAdvice: planAdvice },
    });
    return { rating, assessment, planAdvice };
  } catch {
    return null;
  }
}
