"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";
import Icon from "@/components/Icon";

export interface AutopsyDTO {
  headline: string | null;
  summary: string | null;
  pacingAnalysis: string | null;
  lessons: string[] | null;
  executionScore: number | null;
  positiveSplitPct: number | null;
  fadePct: number | null;
  hrDriftPct: number | null;
  paceCvPct: number | null;
}

export interface AutopsyCandidate {
  id: string;
  label: string;
  autopsy: AutopsyDTO | null;
}

export default function AutopsyPanel({ candidates }: { candidates: AutopsyCandidate[] }) {
  const tr = useT();
  const router = useRouter();
  const [selected, setSelected] = useState<string>(candidates[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Record<string, AutopsyDTO>>({});

  if (candidates.length === 0) return null;

  const current = candidates.find((c) => c.id === selected) ?? candidates[0];
  const data: AutopsyDTO | null = fresh[current.id] ?? current.autopsy;

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/autopsy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: current.id }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? tr("autopsy.error"));
      } else {
        setFresh((f) => ({ ...f, [current.id]: d as AutopsyDTO }));
        router.refresh();
      }
    } catch {
      setError(tr("autopsy.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon name="flask" size={18} className="text-brand" />
          {tr("autopsy.title")}
        </h2>
      </div>
      <p className="mb-3 text-sm text-muted">{tr("autopsy.desc")}</p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          className="input max-w-xs"
          aria-label={tr("autopsy.selectActivity")}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.autopsy ? "✓ " : ""}
              {c.label}
            </option>
          ))}
        </select>
        <button onClick={run} disabled={loading} className="btn-brand !py-2">
          {loading
            ? tr("autopsy.running")
            : data
              ? tr("autopsy.regenerate")
              : tr("autopsy.generate")}
        </button>
      </div>

      {error && (
        <p className="mb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {data ? (
        <div aria-busy={loading}>
          {data.headline && (
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <p className="text-base font-semibold">{data.headline}</p>
              {data.executionScore != null && (
                <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                  {tr("autopsy.score")}: {data.executionScore}/100
                </span>
              )}
            </div>
          )}

          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric
              label={tr("autopsy.split")}
              help={tr("autopsy.splitHelp")}
              goodLabel={tr("autopsy.good")}
              value={fmtPct(data.positiveSplitPct)}
              good={data.positiveSplitPct != null && data.positiveSplitPct <= 2}
            />
            <Metric
              label={tr("autopsy.fade")}
              help={tr("autopsy.fadeHelp")}
              goodLabel={tr("autopsy.good")}
              value={fmtPct(data.fadePct)}
              good={data.fadePct != null && data.fadePct <= 3}
            />
            <Metric
              label={tr("autopsy.drift")}
              help={tr("autopsy.driftHelp")}
              goodLabel={tr("autopsy.good")}
              value={fmtPct(data.hrDriftPct)}
              good={data.hrDriftPct != null && data.hrDriftPct <= 5}
            />
            <Metric
              label={tr("autopsy.regularity")}
              help={tr("autopsy.regularityHelp")}
              goodLabel={tr("autopsy.good")}
              value={fmtPct(data.paceCvPct)}
              good={data.paceCvPct != null && data.paceCvPct <= 4}
            />
          </div>

          {data.summary && <p className="mb-2 text-sm">{data.summary}</p>}
          {data.pacingAnalysis && (
            <p className="mb-2 text-sm text-muted">{data.pacingAnalysis}</p>
          )}
          {data.lessons && data.lessons.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {tr("autopsy.lessons")}
              </div>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {data.lessons.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">{tr("autopsy.empty")}</p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  good,
  help,
  goodLabel,
}: {
  label: string;
  value: string;
  good: boolean;
  help: string;
  goodLabel: string;
}) {
  return (
    <div className="rounded-lg border border-border p-2.5" title={help}>
      <div className="text-xs text-muted">{label}</div>
      <div
        className={`flex items-center gap-1 text-base font-bold ${
          good ? "text-green-700" : ""
        }`}
      >
        {/* segnale non solo cromatico (WCAG 1.4.1): icona + etichetta per SR */}
        {good && (
          <>
            <Icon name="check" size={15} />
            <span className="sr-only">{goodLabel}: </span>
          </>
        )}
        {value}
      </div>
    </div>
  );
}

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v}%`;
}
