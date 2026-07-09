"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";
import { fmtPace } from "@/lib/format";

interface Zone {
  min: number;
  max: number;
}
export interface PhysioDTO {
  lthrBpm: number | null;
  thresholdPaceSecPerKm: number | null;
  maxHrEst: number | null;
  restingHrEst: number | null;
  vo2max: number | null;
  hrZones: { z1: Zone; z2: Zone; z3: Zone; z4: Zone; z5: Zone } | null;
  decouplingPct: number | null;
  durabilityPct: number | null;
  heatSecPerKmPerC: number | null;
  baselineHrvMs: number | null;
  sampleActivities: number | null;
  confidence: string | null;
  notes: string | null;
}

const ZONE_COLORS: Record<string, string> = {
  z1: "bg-sky-500/70",
  z2: "bg-green-500/70",
  z3: "bg-yellow-500/70",
  z4: "bg-orange-500/70",
  z5: "bg-red-500/70",
};

export default function PhysiologyCard({ initial }: { initial: PhysioDTO | null }) {
  const tr = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const p = initial;

  async function recompute() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/physiology/recompute", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setMsg(data.error ?? tr("c.error"));
      else router.refresh();
    } catch {
      setMsg(tr("c.retry"));
    } finally {
      setLoading(false);
    }
  }

  const hasData = p && (p.lthrBpm || p.vo2max || p.decouplingPct != null || p.hrZones);

  const confLabel =
    p?.confidence === "high"
      ? tr("phys.confHigh")
      : p?.confidence === "medium"
        ? tr("phys.confMedium")
        : tr("phys.confLow");

  return (
    <div className="card">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{tr("phys.title")}</h2>
        <button
          onClick={recompute}
          className="btn-ghost !py-1 !text-xs"
          disabled={loading}
        >
          {loading ? tr("phys.recomputing") : tr("phys.recompute")}
        </button>
      </div>
      <p className="mb-3 text-sm text-muted">{tr("phys.desc")}</p>

      {!hasData ? (
        <p className="text-sm text-muted">{tr("phys.empty")}</p>
      ) : (
        <>
          {/* Zone FC */}
          {p!.hrZones && (
            <div className="mb-4">
              <div className="mb-1 text-xs font-medium text-muted">{tr("phys.zones")}</div>
              <div className="flex overflow-hidden rounded-lg">
                {(["z1", "z2", "z3", "z4", "z5"] as const).map((z) => {
                  const zone = p!.hrZones![z];
                  return (
                    <div
                      key={z}
                      className={`flex-1 px-1 py-1.5 text-center text-[10px] font-semibold text-white ${ZONE_COLORS[z]}`}
                      title={`${z.toUpperCase()}: ${zone.min}–${zone.max} bpm`}
                    >
                      {z.toUpperCase()}
                      <div className="text-[9px] font-normal opacity-90">
                        {zone.min}–{zone.max}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Metriche */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric label={tr("phys.lt2")} value={p!.lthrBpm ? `${p!.lthrBpm} bpm` : "—"} />
            <Metric
              label={tr("phys.thresholdPace")}
              value={p!.thresholdPaceSecPerKm ? `${fmtPace(p!.thresholdPaceSecPerKm)}` : "—"}
            />
            <Metric label={tr("phys.vo2max")} value={p!.vo2max ? String(p!.vo2max) : "—"} />
            <Metric
              label={tr("phys.decoupling")}
              value={p!.decouplingPct != null ? `${p!.decouplingPct}%` : "—"}
            />
            <Metric
              label={tr("phys.durability")}
              value={p!.durabilityPct != null ? `${p!.durabilityPct}%` : "—"}
            />
            <Metric
              label={tr("phys.heat")}
              value={
                p!.heatSecPerKmPerC != null
                  ? `+${p!.heatSecPerKmPerC} ${tr("phys.perDegC")}`
                  : "—"
              }
            />
            <Metric
              label={tr("phys.hrv")}
              value={p!.baselineHrvMs != null ? `${p!.baselineHrvMs} ms` : "—"}
            />
            <Metric label={tr("phys.restingHr")} value={p!.restingHrEst ? `${p!.restingHrEst} bpm` : "—"} />
            <Metric label={tr("phys.maxHr")} value={p!.maxHrEst ? `${p!.maxHrEst} bpm` : "—"} />
          </div>

          {p!.notes && (
            <p className="mt-3 rounded-lg bg-brand/5 p-3 text-sm text-muted">{p!.notes}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="rounded-full border border-border px-2 py-0.5">
              {tr("phys.confidence")}: {confLabel}
            </span>
            {p!.sampleActivities != null && (
              <span>
                {tr("phys.basedOnPre")} {p!.sampleActivities} {tr("phys.basedOnPost")}
              </span>
            )}
          </div>
        </>
      )}
      {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}
