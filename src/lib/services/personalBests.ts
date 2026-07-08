import { db } from "@/lib/db";

export interface PB {
  label: string;
  distanceKm: number;
  timeSec: number; // stima su ritmo medio
  date: Date;
}

const STANDARD: { key: string; label: string; d: number }[] = [
  { key: "5k", label: "5 km", d: 5 },
  { key: "10k", label: "10 km", d: 10 },
  { key: "half", label: "Mezza", d: 21.097 },
  { key: "marathon", label: "Maratona", d: 42.195 },
];

/**
 * Stima i record personali per distanza dal ritmo medio delle attività
 * intorno a quella distanza. È una stima (assume ritmo costante), etichettata come tale.
 */
export async function computePersonalBests(userId: string): Promise<PB[]> {
  const activities = await db.activity.findMany({
    where: { userId, distanceKm: { gt: 0 }, avgPaceSecPerKm: { gt: 0 } },
    select: { distanceKm: true, avgPaceSecPerKm: true, date: true },
  });

  const out: PB[] = [];
  for (const s of STANDARD) {
    // attività intorno alla distanza (da 0.9x a 1.5x)
    const candidates = activities.filter(
      (a) =>
        a.distanceKm != null &&
        a.avgPaceSecPerKm != null &&
        a.distanceKm >= s.d * 0.9 &&
        a.distanceKm <= s.d * 1.5,
    );
    if (candidates.length === 0) continue;
    // migliore = ritmo più basso
    const best = candidates.reduce((b, a) =>
      (a.avgPaceSecPerKm ?? Infinity) < (b.avgPaceSecPerKm ?? Infinity) ? a : b,
    );
    out.push({
      label: s.label,
      distanceKm: s.d,
      timeSec: Math.round((best.avgPaceSecPerKm ?? 0) * s.d),
      date: best.date,
    });
  }
  return out;
}
