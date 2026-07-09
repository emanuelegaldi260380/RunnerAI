"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/LangProvider";
import Icon from "@/components/Icon";

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
  const [error, setError] = useState(false);

  // refresh manuale (event handler): qui il setState sincrono è legittimo
  async function load() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/subjective/insights");
      const d = await res.json();
      if (!res.ok) throw new Error();
      setInsights(Array.isArray(d.insights) ? d.insights : []);
      setSampleDays(d.sampleDays ?? 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  // Caricamento iniziale: nessun setState sincrono nel corpo dell'effect
  // (evita react-hooks/set-state-in-effect); gli aggiornamenti avvengono
  // dopo l'await, con guardia di smontaggio.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/subjective/insights");
        const d = await res.json();
        if (!alive) return;
        if (!res.ok) {
          setError(true);
          return;
        }
        setInsights(Array.isArray(d.insights) ? d.insights : []);
        setSampleDays(d.sampleDays ?? 0);
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const firstLoad = loading && insights.length === 0 && !error;

  return (
    <div className="card" aria-busy={loading}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon name="link" size={18} className="text-brand" />
          {tr("subj.title")}
        </h2>
        <button onClick={load} disabled={loading} className="btn-ghost !py-1.5 text-xs">
          {loading ? tr("subj.recomputing") : tr("subj.recompute")}
        </button>
      </div>
      <p className="mb-3 text-sm text-muted">{tr("subj.desc")}</p>

      {firstLoad ? (
        // Skeleton di primo caricamento (NN/g – visibilità dello stato)
        <div className="space-y-2" aria-hidden="true">
          {[0, 1, 2].map((k) => (
            <div key={k} className="h-12 animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      ) : error ? (
        <div>
          <p className="text-sm text-red-600" role="alert">
            {tr("subj.error")}
          </p>
          <button onClick={load} className="btn-ghost mt-2 !py-1.5 text-xs">
            {tr("c.retry")}
          </button>
        </div>
      ) : insights.length === 0 ? (
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
                <span
                  className="ml-auto cursor-help text-xs text-muted"
                  title={tr("subj.rnHelp")}
                >
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
