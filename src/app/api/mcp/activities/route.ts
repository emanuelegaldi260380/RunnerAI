import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserFromToken } from "@/lib/apiToken";
import { rateLimit } from "@/lib/rateLimit";

// Endpoint MCP (Modulo 5): ultime attività dell'utente, autenticate col token personale.
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
  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 15));

  const activities = await db.activity.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
    select: {
      date: true,
      type: true,
      distanceKm: true,
      durationSec: true,
      avgPaceSecPerKm: true,
      avgHr: true,
      maxHr: true,
      elevationGainM: true,
      aiRating: true,
    },
  });

  return NextResponse.json({
    activities: activities.map((a) => ({
      ...a,
      date: a.date.toISOString().slice(0, 10),
    })),
  });
}
