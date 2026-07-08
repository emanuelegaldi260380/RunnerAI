import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { retrieveRelevant } from "@/lib/services/knowledge";

export const maxDuration = 30;

/** Costruisce la query di rilevanza dal profilo + gara principale dell'utente */
async function buildUserQuery(userId: string): Promise<string> {
  const [profile, race] = await Promise.all([
    db.athleteProfile.findUnique({ where: { userId } }),
    db.raceGoal.findFirst({
      where: { userId, status: "planned" },
      orderBy: [{ priority: "asc" }, { raceDate: "asc" }],
    }),
  ]);
  const level = profile?.experience ?? "runner";
  const goals = (profile?.goals as Record<string, unknown> | null) ?? null;
  const dist = race?.distanceKm ?? goals?.raceDistanceKm ?? null;
  if (dist) {
    return `allenamento corsa ${dist}km metodo periodizzazione ${level}`;
  }
  return `allenamento corsa personalizzato ${level} metodi scientifici`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const query = await buildUserQuery(session.user.id);
  const sources = await retrieveRelevant(query, 8);
  return NextResponse.json({ query, sources });
}
