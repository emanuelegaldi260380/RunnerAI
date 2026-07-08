import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { testGarminLogin, testGarminStored } from "@/lib/integrations/garmin";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const email = body?.email?.toString().trim();
  const password = body?.password?.toString();

  try {
    if (email && password) {
      await testGarminLogin(email, password);
    } else {
      await testGarminStored(session.user.id);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Connessione fallita: credenziali errate o MFA attiva." },
      { status: 400 },
    );
  }
}
