import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserFromToken } from "@/lib/apiToken";
import { rateLimit } from "@/lib/rateLimit";

// Endpoint MCP (Modulo 5): piano attivo dell'utente, autenticato col token personale.
export async function GET(req: Request) {
  const userId = await resolveUserFromToken(req);
  if (!userId) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }
  if (!(await rateLimit(`mcp:${userId}`, 60, 60_000))) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova tra poco." },
      { status: 429 },
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const plan = await db.trainingPlan.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
    include: {
      workouts: {
        where: { date: { gte: today } },
        orderBy: { date: "asc" },
        take: 21,
      },
    },
  });

  if (!plan) return NextResponse.json({ plan: null });

  return NextResponse.json({
    plan: {
      title: plan.title,
      rationale: plan.rationale,
      startDate: plan.startDate.toISOString().slice(0, 10),
      endDate: plan.endDate.toISOString().slice(0, 10),
      upcomingWorkouts: plan.workouts.map((w) => ({
        date: w.date.toISOString().slice(0, 10),
        type: w.type,
        title: w.title,
        description: w.description,
        targetDistanceKm: w.targetDistanceKm,
        targetPaceMinSec: w.targetPaceMinSec,
        targetPaceMaxSec: w.targetPaceMaxSec,
        targetHrZone: w.targetHrZone,
        completed: w.completed,
      })),
    },
  });
}
