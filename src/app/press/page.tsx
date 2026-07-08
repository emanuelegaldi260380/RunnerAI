import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import RunAgentButton from "@/components/RunAgentButton";
import NewsFeed, { type NewsItem, type NewsLabels } from "@/components/NewsFeed";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { localeOf, t } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { isAdminEmail } from "@/lib/admin";

export const metadata = {
  title: "Rassegna stampa running — RunnerAI",
  description:
    "I principali articoli e risultati del running mondiale, aggiornati ogni giorno.",
};

export default async function PublicPressPage() {
  const lang = await getServerLang();
  const tt = (k: string) => t(lang, k);
  const session = await auth();
  const articles = await db.pressArticle.findMany({
    where: { url: { startsWith: "http" } },
    orderBy: { publishedAt: "desc" },
    take: 60,
  });
  const news: NewsItem[] = articles.map((a) => ({
    id: a.id,
    url: a.url,
    title: a.title,
    source: a.source,
    category: a.category,
    summary: a.summary,
    content: a.content,
    imageUrl: a.imageUrl,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    translations: (a.translations as NewsItem["translations"]) ?? null,
  }));

  const labels: NewsLabels = {
    readOriginal: tt("press.readOriginal"),
    close: tt("press.close"),
    translating: tt("press.translating"),
    locale: localeOf[lang],
    categories: {
      elite: tt("cat.elite"),
      marathon: tt("cat.marathon"),
      track: tt("cat.track"),
      trail: tt("cat.trail"),
      science: tt("cat.science"),
      gear: tt("cat.gear"),
      other: tt("cat.other"),
    },
  };

  return (
    <main className="flex-1">
      <header className="sticky top-0 z-20 border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            Runner<span className="text-brand">AI</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher current={lang} />
            {session?.user ? (
              <Link href="/dashboard" className="btn-brand">{tt("nav.dashboard")}</Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost">{tt("nav.login")}</Link>
                <Link href="/register" className="btn-brand">{tt("nav.register")}</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <span className="chip">{tt("press.badge")}</span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
              {tt("press.title")}
            </h1>
            <p className="mt-1 text-muted">{tt("press.subtitle")}</p>
          </div>
          {isAdminEmail(session?.user?.email) && (
            <RunAgentButton
              endpoint="/api/cron/press"
              label="Aggiorna ora (admin)"
              runningLabel="Aggiornamento…"
            />
          )}
        </div>

        {news.length === 0 ? (
          <div className="card text-muted">{tt("press.empty")}</div>
        ) : (
          <NewsFeed articles={news} lang={lang} labels={labels} />
        )}

        {!session?.user && (
          <div className="card mt-10 text-center">
            <p className="mb-3 text-muted">{tt("press.ctaText")}</p>
            <Link href="/register" className="btn-brand">
              {tt("press.ctaBtn")}
            </Link>
          </div>
        )}
      </div>

      <footer className="border-t border-border px-6 py-10 text-center text-sm text-muted">
        RunnerAI · Rassegna stampa del running mondiale
      </footer>
    </main>
  );
}
