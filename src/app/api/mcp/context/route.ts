import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserFromToken } from "@/lib/apiToken";
import { computeSubjectiveMapping } from "@/lib/services/subjectiveMapping";

// ---------------------------------------------------------------------------
// Endpoint MCP (Modulo 5): contesto atleta leggibile dal server MCP personale.
// Autenticato con un TOKEN PERSONALE (Authorization: Bearer rai_...), non con
// il SERVICE_TOKEN globale: ogni token è legato a un solo utente.
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  const userId = await resolveUserFromToken(req);
  if (!userId) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  const [profile, physiology, mapping] = await Promise.all([
    db.athleteProfile.findUnique({ where: { userId } }),
    db.physiologyProfile.findUnique({ where: { userId } }),
    computeSubjectiveMapping(userId).catch(() => null),
  ]);

  return NextResponse.json({
    profile: profile
      ? {
          sex: profile.sex,
          experience: profile.experience,
          weeklyVolumeKm: profile.weeklyVolumeKm,
          restingHr: profile.restingHr,
          maxHr: profile.maxHr,
        }
      : null,
    physiology: physiology
      ? {
          lthrBpm: physiology.lthrBpm,
          thresholdPaceSecPerKm: physiology.thresholdPaceSecPerKm,
          vo2max: physiology.vo2max,
          hrZones: physiology.hrZones,
          decouplingPct: physiology.decouplingPct,
          durabilityPct: physiology.durabilityPct,
          heatSecPerKmPerC: physiology.heatSecPerKmPerC,
          baselineHrvMs: physiology.baselineHrvMs,
          confidence: physiology.confidence,
          notes: physiology.notes,
        }
      : null,
    subjectiveInsights: mapping?.insights ?? [],
  });
}
