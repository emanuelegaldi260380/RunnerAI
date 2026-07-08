"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/LangProvider";

interface Source {
  title: string;
  sourceType: string;
  url: string;
  summary: string | null;
  keyPoints: unknown;
  score: number;
}

const typeKeys: Record<string, string> = {
  paper: "kd.tPaper",
  article: "kd.tArticle",
  method: "kd.tMethod",
  guideline: "kd.tGuideline",
  book: "kd.tBook",
};

function keyPointsOf(kp: unknown): string[] {
  if (Array.isArray(kp)) return kp.map((x) => String(x));
  return [];
}

export default function KnowledgeDrawer() {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function openDrawer() {
    setOpen(true);
    if (loaded) return;
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge/relevant");
      const data = await res.json();
      setSources(data.sources ?? []);
      setLoaded(true);
    } catch {
      setSources([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={openDrawer}
        className="btn-ghost px-3 py-2 text-sm"
        title={tr("kd.buttonTitle")}
      >
        📚 <span className="hidden sm:inline">{tr("kd.buttonLabel")}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-card shadow-2xl">
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="text-lg font-bold">{tr("kd.title")}</h2>
                <p className="text-sm text-muted">
                  {tr("kd.subtitle")}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label={tr("kd.close")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <p className="text-sm text-muted">{tr("kd.loading")}</p>
              ) : sources.length === 0 ? (
                <p className="text-sm text-muted">
                  {tr("kd.emptyDrawer")}
                </p>
              ) : (
                <ul className="space-y-3">
                  {sources.map((s, i) => {
                    const kps = keyPointsOf(s.keyPoints);
                    const isOpen = expanded === i;
                    return (
                      <li key={i} className="rounded-xl border border-border p-4">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="chip !px-2 !py-0.5 !text-xs">
                            {typeKeys[s.sourceType] ? tr(typeKeys[s.sourceType]) : s.sourceType}
                          </span>
                          {s.score > 0 && (
                            <span className="text-xs text-muted">
                              {tr("kd.relevance")} {Math.round(s.score * 100)}%
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold leading-snug">{s.title}</h3>
                        {s.summary && (
                          <p className="mt-1 text-sm text-muted">{s.summary}</p>
                        )}
                        {kps.length > 0 && (
                          <>
                            <button
                              onClick={() => setExpanded(isOpen ? null : i)}
                              className="mt-2 text-xs font-medium text-brand hover:underline"
                            >
                              {isOpen ? tr("kd.hideKeyPoints") : tr("kd.keyPoints")}
                            </button>
                            {isOpen && (
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/90">
                                {kps.map((k, j) => (
                                  <li key={j}>{k}</li>
                                ))}
                              </ul>
                            )}
                          </>
                        )}
                        {s.url.startsWith("http") && (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-xs font-medium text-brand hover:underline"
                          >
                            {tr("kd.openSource")}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-border p-4 text-center">
              <Link
                href="/knowledge"
                onClick={() => setOpen(false)}
                className="text-sm font-semibold text-brand hover:underline"
              >
                {tr("kd.seeAll")}
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
