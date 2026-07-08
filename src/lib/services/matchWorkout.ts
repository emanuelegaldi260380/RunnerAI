import { db } from "@/lib/db";

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Collega un'attività svolta al workout pianificato dello stesso giorno
 * (piano attivo), segnandolo come completato. Chiude il loop di auto-correzione.
 */
export async function matchActivityToPlan(
  userId: string,
  activityId: string,
  date: Date,
  type?: string | null,
): Promise<string | null> {
  const plan = await db.trainingPlan.findFirst({
    where: { userId, status: "active" },
    include: {
      workouts: { where: { completed: false, type: { not: "rest" } }, include: { activity: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!plan) return null;

  const day = isoDay(date);
  const sameDay = plan.workouts.filter(
    (w) => isoDay(w.date) === day && !w.activity,
  );
  if (sameDay.length === 0) return null;

  // preferisci lo stesso tipo, altrimenti il primo del giorno
  const chosen = (type && sameDay.find((w) => w.type === type)) || sameDay[0];

  await db.$transaction([
    db.plannedWorkout.update({ where: { id: chosen.id }, data: { completed: true } }),
    db.activity.update({ where: { id: activityId }, data: { plannedWorkoutId: chosen.id } }),
  ]);
  return chosen.id;
}
