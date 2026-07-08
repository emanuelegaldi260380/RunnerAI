import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isServiceAuthorized } from "@/lib/serviceAuth";

export async function GET(req: Request) {
  if (!isServiceAuthorized(req)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(50, parseInt(url.searchParams.get("limit") || "10", 10));
  const articles = await db.pressArticle.findMany({
    where: { url: { startsWith: "http" } },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      title: true,
      url: true,
      source: true,
      category: true,
      summary: true,
      publishedAt: true,
    },
  });
  return NextResponse.json({ articles });
}
