import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

/** Export GDPR: tutti i dati dell'utente in JSON scaricabile. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const userId = session.user.id;

  const [user, profile, subscription, activities, plans, races, offDays, connections] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, emailVerified: true, createdAt: true },
      }),
      db.athleteProfile.findUnique({ where: { userId } }),
      db.subscription.findUnique({
        where: { userId },
        select: { status: true, forcedTier: true, trialEndsAt: true, currentPeriodEnd: true },
      }),
      db.activity.findMany({ where: { userId } }),
      db.trainingPlan.findMany({
        where: { userId },
        include: { workouts: true },
      }),
      db.raceGoal.findMany({ where: { userId } }),
      db.offDay.findMany({ where: { userId } }),
      // integrazioni: NO token (cifrati) — solo metadati
      db.integrationConnection.findMany({
        where: { userId },
        select: { provider: true, status: true, lastSyncAt: true, createdAt: true },
      }),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    note: "I token delle integrazioni non sono inclusi per motivi di sicurezza.",
    user,
    profile,
    subscription,
    activities,
    plans,
    races,
    offDays,
    connections,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="runnerai-dati.json"',
    },
  });
}
