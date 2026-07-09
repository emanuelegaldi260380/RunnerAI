"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/LangProvider";

type FactorKey = "rpe" | "legs" | "sleep" | "mood";
type OutcomeKey = "hrv" | "hr" | "pace";

interface Insight {
  factor: FactorKey;
  outcome: OutcomeKey;
  r: number;
  n: number;
  effect: "better" | "worse";
  strength: "strong" | "moderate" | "weak";
}

export default function SubjectiveInsightsCard() {
  const tr = useT();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [sampleDays, setSampleDays] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/subjective/insights");
      const d = await res.json();
      if (res.ok) {
        setInsights(Array.isArray(d.insights) ? d.insights : []);
        setSampleDays(d.sampleDays ?? 0);
      }
    } catch {
      /* silenzioso: la card resta in stato vuoto */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{tr("subj.title")}</h2>
        <button onClick={load} disabled={loading} className="btn-ghost !py-1 !text-xs">
          {loading ? tr("subj.recomputing") : tr("subj.recompute")}
        </button>
      </div>
      <p className="mb-3 text-sm text-muted">{tr("subj.desc")}</p>

      {insights.length === 0 ? (
        <p className="text-sm text-muted">
          {sampleDays > 0 ? tr("subj.needMore") : tr("subj.empty")}
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {insights.map((i, idx) => (
              <li
                key={idx}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    i.effect === "better" ? "bg-green-500" : "bg-orange-500"
                  }`}
                />
                <span>
                  {tr("subj.when")} {tr(`subj.f.${i.factor}`)}, {tr(`subj.o.${i.outcome}`)}{" "}
                  <b>{i.effect === "better" ? tr("subj.better") : tr("subj.worse")}</b>
                </span>
                <span className="ml-auto text-xs text-muted">
                  {tr(`subj.strength.${i.strength}`)} · r={i.r} · n={i.n}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            {sampleDays} {tr("subj.samples")}
          </p>
        </>
      )}
    </div>
  );
}
