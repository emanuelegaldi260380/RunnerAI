import { NextResponse } from "next/server";
import { isServiceAuthorized } from "@/lib/serviceAuth";
import { retrieveRelevant } from "@/lib/services/knowledge";

export async function GET(req: Request) {
  if (!isServiceAuthorized(req)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "allenamento corsa metodi scientifici";
  const k = Math.min(20, parseInt(url.searchParams.get("k") || "6", 10));
  const sources = await retrieveRelevant(q, k);
  return NextResponse.json({
    query: q,
    sources: sources.map((s) => ({
      title: s.title,
      sourceType: s.sourceType,
      url: s.url,
      summary: s.summary,
      keyPoints: s.keyPoints,
      score: s.score,
    })),
  });
}
