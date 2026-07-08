import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { encryptionConfigured } from "@/lib/crypto";
import { connectGarmin, syncGarmin } from "@/lib/integrations/garmin";
import { runWithUser } from "@/lib/requestContext";
import { getServerLang } from "@/lib/i18n-server";
import { rateLimit } from "@/lib/rateLimit";

export const maxDuration = 120;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  // Anti-oracolo credenziali / login costosi ripetuti.
  if (!(await rateLimit(`garmin-connect:${session.user.id}`, 5, 15 * 60_000))) {
    return NextResponse.json(
      { error: "Troppi tentativi. Riprova più tardi." },
      { status: 429 },
    );
  }
  if (!encryptionConfigured()) {
    return NextResponse.json(
      { error: "ENCRYPTION_KEY non configurata: impossibile salvare le credenziali in sicurezza" },
      { status: 501 },
    );
  }

  const body = await req.json().catch(() => null);
  const email = body?.email?.toString().trim();
  const password = body?.password?.toString();
  if (!email || !password) {
    return NextResponse.json({ error: "Email e password richieste" }, { status: 400 });
  }

  try {
    await connectGarmin(session.user.id, email, password);
  } catch {
    return NextResponse.json(
      {
        error:
          "Login Garmin fallito. Verifica le credenziali; se hai la verifica in due passaggi (MFA) attiva, al momento non è supportata.",
      },
      { status: 400 },
    );
  }

  // scarica lo storico performance (fino a 100 attività)
  let imported = 0;
  try {
    const lang = await getServerLang();
    ({ imported } = await runWithUser(session.user.id, () =>
      syncGarmin(session.user.id, 100, lang),
    ));
  } catch {
    // connessione salvata comunque; la sync potrà essere ritentata
  }

  return NextResponse.json({ ok: true, imported });
}
