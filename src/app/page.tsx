import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import NewsFeed, { type NewsItem, type NewsLabels } from "@/components/NewsFeed";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SignOutButton from "@/components/SignOutButton";
import PlansOverview from "@/components/PlansOverview";
import SiteFooter from "@/components/SiteFooter";
import Icon from "@/components/Icon";
import { localeOf, t } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";

type Row = {
  id: string;
  url: string;
  title: string;
  source: string | null;
  category: string;
  summary: string | null;
  content: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
  translations: unknown;
};

function toNews(a: Row): NewsItem {
  return {
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
  };
}

export default async function Home() {
  const lang = await getServerLang();
  const tt = (k: string) => t(lang, k);
  const [session, articles] = await Promise.all([
    auth(),
    db.pressArticle.findMany({
      where: { url: { startsWith: "http" } },
      orderBy: { publishedAt: "desc" },
      take: 6,
    }),
  ]);
  const news = articles.map(toNews);

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

  const features = [
    { icon: "download", t: tt("f1.t"), d: tt("f1.d") },
    { icon: "sparkles", t: tt("f2.t"), d: tt("f2.d") },
    { icon: "flask", t: tt("f3.t"), d: tt("f3.d") },
    { icon: "trending-up", t: tt("f4.t"), d: tt("f4.d") },
  ];

  const stats: [string, string][] = [
    ["3", tt("stats.llm")],
    [tt("stats.dailyN"), tt("stats.daily")],
    [tt("stats.trialN"), tt("stats.trial")],
    ["100%", tt("stats.custom")],
  ];

  return (
    <main className="flex-1">
      {/* ===================== HERO A TUTTO SCHERMO ===================== */}
      <section className="relative flex min-h-[100svh] flex-col">
        {/* immagine full-screen */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/hero.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40" />

        {/* header sovrapposto */}
        <header className="relative z-20">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
            <Link href="/" className="text-xl font-extrabold tracking-tight text-white">
              Runner<span className="text-brand">AI</span>
            </Link>
            <nav className="flex items-center gap-2 sm:gap-3">
              <a href="#rassegna" className="hidden text-sm font-medium text-white/80 hover:text-white md:block">
                {tt("nav.press")}
              </a>
              <LanguageSwitcher current={lang} />
              {session?.user ? (
                <>
                  <Link href="/dashboard" className="btn-brand">{tt("nav.dashboard")}</Link>
                  <span className="hidden sm:inline">
                    <SignOutButton label={tt("nav.logout")} />
                  </span>
                </>
              ) : (
                <>
                  <Link href="/login" className="hidden btn-ghost sm:inline-flex">
                    {tt("nav.login")}
                  </Link>
                  <Link href="/register" className="btn-brand">{tt("nav.register")}</Link>
                </>
              )}
            </nav>
          </div>
        </header>

        {/* contenuto hero */}
        <div className="relative z-10 flex flex-1 items-center">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6">
            <div className="max-w-3xl">
              <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">
                {tt("hero.badge")}
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.03] tracking-tight text-white sm:text-6xl lg:text-7xl">
                {tt("hero.title1")}
                <br />
                <span className="text-gradient">{tt("hero.title2")}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-white/85 sm:text-xl">
                {tt("hero.desc")}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-brand px-8 py-3.5 text-base sm:text-lg">
                  {tt("hero.ctaTry")}
                </Link>
                <a
                  href="#rassegna"
                  className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:text-lg"
                >
                  {tt("hero.ctaRead")}
                </a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75">
                <span>{tt("hero.noCard")}</span>
                <span>{tt("hero.fast")}</span>
                <span>{tt("hero.byok")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* strip statistiche in fondo all'hero */}
        <div className="relative z-10 border-t border-white/15 bg-black/30 backdrop-blur">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-5 py-6 text-center sm:px-6 md:grid-cols-4">
            {stats.map(([n, l]) => (
              <div key={l}>
                <div className="text-2xl font-extrabold text-white sm:text-3xl">{n}</div>
                <div className="mt-1 text-xs text-white/70 sm:text-sm">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== RASSEGNA STAMPA ===================== */}
      <section id="rassegna" className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="chip">{tt("press.badge")}</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {tt("press.title")}
            </h2>
            <p className="mt-1 text-muted">{tt("press.subtitle")}</p>
          </div>
          <Link href="/press" className="shrink-0 text-sm font-semibold text-brand hover:underline">
            {tt("press.seeAll")}
          </Link>
        </div>
        {news.length === 0 ? (
          <div className="card text-muted">{tt("press.empty")}</div>
        ) : (
          <NewsFeed articles={news} lang={lang} labels={labels} />
        )}
      </section>

      {/* ===================== BANNER IMMAGINE A TUTTA LARGHEZZA ===================== */}
      <section className="relative flex min-h-[60vh] items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: "url('/images/run1.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 text-center sm:px-6">
          <h2 className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">
            Ogni passo conta. Ogni dato migliora il tuo piano.
          </h2>
        </div>
      </section>

      {/* ===================== FEATURES ===================== */}
      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
            {tt("features.title")}
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.t} className="card">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Icon name={f.icon} size={26} />
                </div>
                <h3 className="mb-1 font-bold">{f.t}</h3>
                <p className="text-sm text-muted">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Come nasce il piano */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
        <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
          {tt("method.title")}
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["m1.t", "m1.d", "download"],
            ["m2.t", "m2.d", "bot"],
            ["m3.t", "m3.d", "sparkles"],
            ["m4.t", "m4.d", "refresh"],
          ].map(([tk, dk, icon]) => (
            <div key={tk} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 text-brand">
                <Icon name={icon} size={30} />
              </div>
              <h3 className="font-bold">{tt(tk)}</h3>
              <p className="mt-1 text-sm text-muted">{tt(dk)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Prezzi */}
      <section id="prezzi" className="bg-surface">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:px-6 sm:py-20">
          <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
            {tt("pricing.title")}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-muted">{tt("pricing.sub")}</p>
          <div className="mt-8">
            <PlansOverview />
          </div>
          <p className="mx-auto mt-4 max-w-xl text-center text-xs text-muted">
            {tt("price.renewal")}
          </p>
          <div className="mt-6 text-center">
            <Link href="/register" className="btn-brand px-7 py-3 text-base">
              {tt("hero.ctaTry")}
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-20">
        <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
          {tt("faq.title")}
        </h2>
        <div className="mt-8 space-y-3">
          {[
            ["faq.q1", "faq.a1"],
            ["faq.q2", "faq.a2"],
            ["faq.q4", "faq.a4"],
            ["faq.q3", "faq.a3"],
          ].map(([q, a]) => (
            <details key={q} className="group rounded-xl border border-border bg-card p-4">
              <summary className="cursor-pointer list-none font-semibold">
                <span className="flex items-center justify-between">
                  {tt(q)}
                  <span className="text-brand transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-2 text-sm text-muted">{tt(a)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ===================== CTA FINALE ===================== */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/run4.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 to-black/45" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 text-center text-white sm:px-6 sm:py-28">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            {tt("cta.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">{tt("cta.desc")}</p>
          <Link href="/register" className="btn-brand mt-8 px-9 py-3.5 text-base sm:text-lg">
            {tt("cta.btn")}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
