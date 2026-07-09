"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import Icon from "@/components/Icon";

interface Source {
  id: string;
  title: string;
  sourceType: string;
  url: string;
  summary: string | null;
  keyPoints: unknown;
  imageUrl: string | null;
  translations: unknown;
  score: number;
}

const typeLabels: Record<string, string> = {
  paper: "Paper",
  article: "Articolo",
  method: "Metodo",
  guideline: "Linea guida",
  book: "Libro",
};

function keyPointsOf(kp: unknown): string[] {
  return Array.isArray(kp) ? kp.map((x) => String(x)) : [];
}

export default function KnowledgeCard({
  source,
  index = 0,
  isAdmin = false,
}: {
  source: Source;
  index?: number;
  isAdmin?: boolean;
}) {
  const lang = useLang();
  const tr =
    (source.translations as Record<string, { title?: string; summary?: string }> | null) ?? {};
  const [broken, setBroken] = useState(false);
  const [open, setOpen] = useState(false);
  const [img, setImg] = useState<string | null>(source.imageUrl);
  const [gen, setGen] = useState(!source.imageUrl); // generazione in corso
  const [title, setTitle] = useState(
    lang !== "it" ? tr[lang]?.title ?? source.title : source.title,
  );
  const [summary, setSummary] = useState(
    lang !== "it" ? tr[lang]?.summary ?? source.summary : source.summary,
  );
  const kps = keyPointsOf(source.keyPoints);

  // traduzione lazy di titolo/sintesi
  useEffect(() => {
    if (lang === "it" || tr[lang]?.title) return;
    let active = true;
    const timer = setTimeout(
      () => {
        fetch("/api/knowledge-translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: source.id, lang }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (active && d.title) {
              setTitle(d.title);
              if (d.summary) setSummary(d.summary);
            }
          })
          .catch(() => {});
      },
      Math.min(index, 20) * 800,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, source.id]);

  useEffect(() => {
    if (source.imageUrl) return;
    let active = true;
    // scaglionamento: evita di generare tutte le immagini in parallelo
    const delay = Math.min(index, 20) * 1500;
    const timer = setTimeout(() => {
      fetch(`/api/knowledge-image?id=${source.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (active) {
            setImg(d.path ?? null);
            setGen(false);
          }
        })
        .catch(() => active && setGen(false));
    }, delay);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [source.id, source.imageUrl, index]);

  async function regen() {
    setGen(true);
    setBroken(false);
    try {
      const r = await fetch(`/api/knowledge-image?id=${source.id}&force=1`);
      const d = await r.json();
      if (d.path) setImg(d.path + "?t=" + d.path.length);
    } finally {
      setGen(false);
    }
  }

  const showImg = img && !broken;

  return (
    <div className="card flex flex-col overflow-hidden p-0">
      <div className="relative aspect-[16/9] w-full">
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img!}
            alt=""
            loading="lazy"
            onError={() => setBroken(true)}
            className="h-full w-full object-cover"
          />
        ) : gen ? (
          <div className="flex h-full w-full animate-pulse items-center justify-center bg-gradient-to-br from-surface to-brand/5">
            <Icon name="flask" size={30} className="text-brand opacity-30" />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/15 to-accent/15">
            <Icon name="flask" size={40} className="text-brand opacity-60" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-brand shadow-sm backdrop-blur">
          {typeLabels[source.sourceType] ?? source.sourceType}
        </span>
        {isAdmin && !gen && (
          <button
            onClick={regen}
            title="Rigenera immagine"
            className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-xs shadow-sm backdrop-blur hover:bg-white"
          >
            ↻
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-bold leading-snug">{title}</h3>
        {source.score > 0 && (
          <span className="mt-1 text-xs text-muted">
            rilevanza {Math.round(source.score * 100)}%
          </span>
        )}
        {summary && (
          <p className="mt-2 text-sm text-muted">{summary}</p>
        )}
        {kps.length > 0 && (
          <>
            <button
              onClick={() => setOpen((o) => !o)}
              className="mt-2 self-start text-xs font-medium text-brand hover:underline"
            >
              {open ? "Nascondi punti chiave" : "Punti chiave"}
            </button>
            {open && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/90">
                {kps.map((k, j) => (
                  <li key={j}>{k}</li>
                ))}
              </ul>
            )}
          </>
        )}
        {source.url.startsWith("http") && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs font-medium text-brand hover:underline"
          >
            Apri fonte ↗
          </a>
        )}
      </div>
    </div>
  );
}
