import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { translateFields } from "@/lib/services/translate";
import { rateLimit } from "@/lib/rateLimit";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  // Traduzione LLM (testo) a pagamento: rate-limit per-utente contro l'abuso.
  if (!(await rateLimit(`kb-tr:${session.user.id}`, 30, 60_000))) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova tra poco." },
      { status: 429 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const id = body?.id?.toString();
  const lang = body?.lang;
  if (!id || !isLang(lang) || lang === "it") {
    return NextResponse.json({ title: null, summary: null });
  }

  const src = await db.scientificSource.findUnique({ where: { id } });
  if (!src) return NextResponse.json({ title: null, summary: null });

  const tr = (src.translations as Record<string, { title?: string; summary?: string }> | null) ?? {};
  if (tr[lang]?.title) {
    return NextResponse.json({ title: tr[lang].title, summary: tr[lang].summary ?? src.summary });
  }

  const out = await translateFields({ title: src.title, summary: src.summary ?? "" }, lang);
  // cache solo se realmente tradotto
  if (out.title && out.title !== src.title) {
    await db.scientificSource.update({
      where: { id },
      data: { translations: { ...tr, [lang]: { title: out.title, summary: out.summary } } },
    });
  }
  return NextResponse.json({ title: out.title, summary: out.summary });
}
