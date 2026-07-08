import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { testGarminLogin, testGarminStored } from "@/lib/integrations/garmin";
import { rateLimit } from "@/lib/rateLimit";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  // Anti-oracolo credenziali: impedisce di usare l'endpoint come validatore di
  // coppie email/password Garmin (credential stuffing verso terzi) o come
  // generatore di login costosi (browser-automation).
  if (!(await rateLimit(`garmin-test:${session.user.id}`, 5, 15 * 60_000))) {
    return NextResponse.json(
      { error: "Troppi tentativi. Riprova più tardi." },
      { status: 429 },
    );
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
