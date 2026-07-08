import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { encrypt, encryptionConfigured } from "@/lib/crypto";
import { resolveUserTier } from "@/lib/plans";

const PROVIDERS = ["claude", "openai", "deepseek"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  if (!encryptionConfigured()) {
    return NextResponse.json(
      { error: "ENCRYPTION_KEY non configurata: impossibile salvare la chiave in sicurezza" },
      { status: 501 },
    );
  }
  const { tier } = await resolveUserTier(session.user.id);
  if (tier !== "pro") {
    return NextResponse.json(
      { error: "La funzione BYOK (usa la tua chiave AI) è disponibile con il piano Pro." },
      { status: 403 },
    );
  }
  const body = await req.json().catch(() => null);
  const provider = body?.provider?.toString();
  const model = body?.model?.toString().trim();
  const apiKey = body?.apiKey?.toString().trim();
  const enabled = body?.enabled !== false;

  if (!PROVIDERS.includes(provider) || !model) {
    return NextResponse.json({ error: "Provider o modello non validi" }, { status: 400 });
  }

  const existing = await db.userLlmConfig.findUnique({ where: { userId: session.user.id } });
  if (!apiKey && !existing) {
    return NextResponse.json({ error: "Chiave API richiesta" }, { status: 400 });
  }

  await db.userLlmConfig.upsert({
    where: { userId: session.user.id },
    update: {
      provider,
      model,
      enabled,
      ...(apiKey ? { apiKeyEnc: encrypt(apiKey) } : {}),
    },
    create: {
      userId: session.user.id,
      provider,
      model,
      enabled,
      apiKeyEnc: encrypt(apiKey!),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  await db.userLlmConfig.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
