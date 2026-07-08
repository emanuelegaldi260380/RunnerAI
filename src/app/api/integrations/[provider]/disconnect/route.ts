import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { disconnect, type Provider } from "@/lib/integrations/tokens";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const { provider } = await params;
  if (provider !== "strava" && provider !== "garmin") {
    return NextResponse.json({ error: "Provider non valido" }, { status: 400 });
  }
  await disconnect(session.user.id, provider as Provider);
  return NextResponse.json({ ok: true });
}
