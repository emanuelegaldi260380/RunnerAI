import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { testStrava } from "@/lib/integrations/strava";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  try {
    await testStrava(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Connessione fallita" },
      { status: 400 },
    );
  }
}
