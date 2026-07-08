import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cronAuth";
import { runResearch } from "@/lib/services/scienceAgent";

export const maxDuration = 300;

async function handle(req: Request) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  try {
    const result = await runResearch();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "errore" },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
