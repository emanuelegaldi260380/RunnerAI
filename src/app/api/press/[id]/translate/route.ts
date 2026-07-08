import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { translateFields } from "@/lib/services/translate";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const lang = body?.lang;
  if (!isLang(lang)) {
    return NextResponse.json({ error: "Lingua non valida" }, { status: 400 });
  }

  // /press è pubblico (anche visitatori non loggati): non richiediamo auth, ma
  // limitiamo per IP per evitare abuso di traduzioni LLM a pagamento + write DB.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (!(await rateLimit(`press-tr:${ip}`, 30, 60_000))) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova tra poco." },
      { status: 429 },
    );
  }

  const article = await db.pressArticle.findUnique({ where: { id } });
  if (!article) {
    return NextResponse.json({ error: "Articolo non trovato" }, { status: 404 });
  }

  const translations =
    (article.translations as Record<
      string,
      { title?: string; summary?: string; content?: string }
    > | null) ?? {};

  // italiano = base
  if (lang === "it") {
    return NextResponse.json({
      title: article.title,
      summary: article.summary,
      content: article.content,
    });
  }
  // cache già presente (titolo + contenuto)
  if (translations[lang]?.content && translations[lang]?.title) {
    return NextResponse.json({
      title: translations[lang]?.title ?? article.title,
      summary: translations[lang]?.summary ?? article.summary,
      content: translations[lang]?.content,
    });
  }

  // traduci e metti in cache
  const tr = await translateFields(
    {
      title: article.title,
      summary: article.summary ?? "",
      content: article.content ?? "",
    },
    lang,
  );

  const translated = !!tr.title && tr.title !== article.title;
  if (translated) {
    const merged = {
      ...translations,
      [lang]: { title: tr.title, summary: tr.summary, content: tr.content },
    };
    await db.pressArticle.update({
      where: { id },
      data: { translations: merged },
    });
  }

  return NextResponse.json({ title: tr.title, summary: tr.summary, content: tr.content });
}
