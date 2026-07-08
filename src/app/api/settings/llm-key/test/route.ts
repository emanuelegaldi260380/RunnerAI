import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buildUserProvider, type ProviderName } from "@/lib/llm";
import { decrypt } from "@/lib/crypto";
import { rateLimit } from "@/lib/rateLimit";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Ogni test effettua una chiamata LLM: limitiamo per coerenza con le altre
  // route che consumano risorse (10 test/minuto per utente).
  if (!(await rateLimit(`llm-key-test:${session.user.id}`, 10, 60_000))) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova tra poco." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  let provider = body?.provider?.toString();
  let model = body?.model?.toString().trim();
  let apiKey = body?.apiKey?.toString().trim();

  // se non passata, usa la config salvata
  if (!apiKey) {
    const cfg = await db.userLlmConfig.findUnique({ where: { userId: session.user.id } });
    if (!cfg) return NextResponse.json({ error: "Nessuna chiave configurata" }, { status: 400 });
    provider = cfg.provider;
    model = cfg.model;
    apiKey = decrypt(cfg.apiKeyEnc);
  }

  if (!["claude", "openai", "deepseek"].includes(provider) || !model) {
    return NextResponse.json({ error: "Provider o modello non validi" }, { status: 400 });
  }

  try {
    const prov = buildUserProvider(provider as ProviderName, apiKey!, model);
    const out = await prov.chat({
      messages: [{ role: "user", content: "Rispondi solo con: OK" }],
      maxTokens: 5,
    });
    return NextResponse.json({ ok: true, sample: out.slice(0, 20) });
  } catch (e) {
    return NextResponse.json(
      { error: "Test fallito: " + (e instanceof Error ? e.message.slice(0, 120) : "errore") },
      { status: 400 },
    );
  }
}
