"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

export interface NewsItem {
  id: string;
  url: string;
  title: string;
  source: string | null;
  category: string;
  summary: string | null;
  content: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
  translations?: Record<string, { title?: string; summary?: string; content?: string }> | null;
}

export interface NewsLabels {
  readOriginal: string;
  close: string;
  translating: string;
  locale: string;
  categories: Record<string, string>;
}

function fmtDate(d: string | null, locale: string): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Thumb({
  src,
  className,
}: {
  src: string | null;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-brand/15 to-accent/15 ${className ?? ""}`}
      >
        <Icon name="activity" size={40} className="text-brand opacity-60" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      className={`object-cover ${className ?? ""}`}
    />
  );
}

export default function NewsFeed({
  articles,
  lang,
  labels,
}: {
  articles: NewsItem[];
  lang: string;
  labels: NewsLabels;
}) {
  const [sel, setSel] = useState<NewsItem | null>(null);
  // testo tradotto del reader (lazy)
  const [reader, setReader] = useState<{
    summary: string | null;
    content: string | null;
    loading: boolean;
  }>({ summary: null, content: null, loading: false });

  const [trMap, setTrMap] = useState<Record<string, { title?: string; summary?: string }>>({});

  function titleFor(a: NewsItem): string {
    if (lang === "it") return a.title;
    return trMap[a.id]?.title ?? a.translations?.[lang]?.title ?? a.title;
  }
  function summaryFor(a: NewsItem): string | null {
    if (lang === "it") return a.summary;
    return trMap[a.id]?.summary ?? a.translations?.[lang]?.summary ?? a.summary;
  }

  // traduzione lazy (staggered) di titoli/sintesi non ancora tradotti
  useEffect(() => {
    if (lang === "it") return;
    let active = true;
    const missing = articles.filter(
      (a) => !a.translations?.[lang]?.title && !trMap[a.id]?.title,
    );
    const timers = missing.map((a, i) =>
      setTimeout(
        () => {
          fetch(`/api/press/${a.id}/translate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lang }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (active && d.title)
                setTrMap((m) => ({ ...m, [a.id]: { title: d.title, summary: d.summary } }));
            })
            .catch(() => {});
        },
        Math.min(i, 20) * 900,
      ),
    );
    return () => {
      active = false;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  async function open(a: NewsItem) {
    setSel(a);
    const baseSummary = summaryFor(a);
    // italiano o traduzione contenuto già in cache
    const cachedContent = lang !== "it" ? a.translations?.[lang]?.content : a.content;
    if (lang === "it" || cachedContent) {
      setReader({ summary: baseSummary, content: cachedContent ?? a.content, loading: false });
      return;
    }
    // traduci il testo esteso al volo
    setReader({ summary: baseSummary, content: null, loading: true });
    try {
      const res = await fetch(`/api/press/${a.id}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang }),
      });
      const data = await res.json();
      setReader({
        summary: data.summary ?? baseSummary,
        content: data.content ?? a.content,
        loading: false,
      });
    } catch {
      setReader({ summary: baseSummary, content: a.content, loading: false });
    }
  }

  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSel(null);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sel]);

  const cat = (c: string) => labels.categories[c] ?? c;

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <button
            key={a.id}
            onClick={() => open(a)}
            className="card group flex flex-col overflow-hidden p-0 text-left transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
          >
            <div className="relative">
              <Thumb src={a.imageUrl} className="aspect-[16/9] w-full" />
              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-brand shadow-sm backdrop-blur">
                {cat(a.category)}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h3 className="font-bold leading-snug group-hover:text-brand">
                {titleFor(a)}
              </h3>
              {summaryFor(a) && (
                <p className="mt-2 line-clamp-2 text-sm text-muted">
                  {summaryFor(a)}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                {a.source && <span className="truncate">{a.source}</span>}
                <span>· {fmtDate(a.publishedAt, labels.locale)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {sel && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSel(null)}
          />
          <div className="relative z-10 my-4 w-full max-w-2xl overflow-hidden rounded-2xl bg-card shadow-2xl">
            <button
              onClick={() => setSel(null)}
              aria-label={labels.close}
              className="focus-ring absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md backdrop-blur transition hover:bg-white"
            >
              <Icon name="x" size={18} />
            </button>

            <Thumb src={sel.imageUrl} className="aspect-[16/9] w-full" />

            <div className="p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="chip !px-2.5 !py-0.5 !text-xs">
                  {cat(sel.category)}
                </span>
                {sel.source && <span>{sel.source}</span>}
                <span>· {fmtDate(sel.publishedAt, labels.locale)}</span>
              </div>

              <h2 className="text-2xl font-extrabold leading-tight">
                {titleFor(sel)}
              </h2>

              {reader.summary && (
                <p className="mt-4 rounded-lg bg-brand/5 p-3 text-[15px] font-medium">
                  {reader.summary}
                </p>
              )}

              {reader.loading ? (
                <p className="mt-4 text-sm text-muted">{labels.translating}</p>
              ) : (
                reader.content && (
                  <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
                    {reader.content}
                    <span className="text-muted">…</span>
                  </p>
                )
              )}

              <div className="mt-6 flex items-center gap-3">
                <a
                  href={sel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-brand"
                >
                  {labels.readOriginal}
                </a>
                <button onClick={() => setSel(null)} className="btn-ghost">
                  {labels.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
