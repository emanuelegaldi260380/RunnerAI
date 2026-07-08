"use client";

import { useMemo, useState } from "react";
import { pearson } from "@/lib/stats";
import { useT } from "@/components/LangProvider";

export interface ActivityPoint {
  date: string; // ISO
  distanceKm: number | null;
  durationSec: number | null;
  avgPaceSecPerKm: number | null;
  avgHr: number | null;
  maxHr: number | null;
  elevationGainM: number | null;
  cadence: number | null;
  calories: number | null;
}

type MetricKey =
  | "distanceKm"
  | "durationMin"
  | "avgPaceSecPerKm"
  | "avgHr"
  | "maxHr"
  | "elevationGainM"
  | "cadence"
  | "calories";

const METRICS: Record<MetricKey, { labelKey: string; get: (a: ActivityPoint) => number | null }> = {
  distanceKm: { labelKey: "act.mDistance", get: (a) => a.distanceKm },
  durationMin: { labelKey: "act.mDuration", get: (a) => (a.durationSec != null ? a.durationSec / 60 : null) },
  avgPaceSecPerKm: { labelKey: "act.mPace", get: (a) => a.avgPaceSecPerKm },
  avgHr: { labelKey: "act.mAvgHr", get: (a) => a.avgHr },
  maxHr: { labelKey: "act.mMaxHr", get: (a) => a.maxHr },
  elevationGainM: { labelKey: "act.mElevation", get: (a) => a.elevationGainM },
  cadence: { labelKey: "act.mCadence", get: (a) => a.cadence },
  calories: { labelKey: "act.mCalories", get: (a) => a.calories },
};

const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

export default function ActivityCharts({ activities }: { activities: ActivityPoint[] }) {
  const tr = useT();
  const [xAxis, setXAxis] = useState<"date" | MetricKey>("date");
  const [yAxis, setYAxis] = useState<MetricKey>("distanceKm");

  const isTime = xAxis === "date";

  const points = useMemo(() => {
    const sorted = [...activities].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const out: { x: number; y: number; label: string }[] = [];
    for (const a of sorted) {
      const y = METRICS[yAxis].get(a);
      if (y == null) continue;
      let x: number | null;
      if (isTime) x = new Date(a.date).getTime();
      else x = METRICS[xAxis as MetricKey].get(a);
      if (x == null) continue;
      out.push({ x, y, label: new Date(a.date).toLocaleDateString("it-IT") });
    }
    return out;
  }, [activities, xAxis, yAxis, isTime]);

  const corr = useMemo(
    () => (isTime ? null : pearson(points.map((p) => [p.x, p.y]))),
    [points, isTime],
  );

  const W = 720, H = 300, PAD = 44;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const sx = (x: number) => PAD + ((x - xMin) / (xMax - xMin || 1)) * (W - PAD - 12);
  const sy = (y: number) => H - PAD - ((y - yMin) / (yMax - yMin || 1)) * (H - PAD - 12);

  return (
    <div className="card">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-semibold">{tr("act.chartsTitle")}</h3>
          <p className="text-sm text-muted">
            {tr("act.chartsDesc")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="label">{tr("act.axisX")}</label>
            <select
              className="input"
              value={xAxis}
              onChange={(e) => setXAxis(e.target.value as "date" | MetricKey)}
            >
              <option value="date">{tr("act.dateTime")}</option>
              {METRIC_KEYS.map((k) => (
                <option key={k} value={k}>{tr(METRICS[k].labelKey)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{tr("act.axisY")}</label>
            <select
              className="input"
              value={yAxis}
              onChange={(e) => setYAxis(e.target.value as MetricKey)}
            >
              {METRIC_KEYS.map((k) => (
                <option key={k} value={k}>{tr(METRICS[k].labelKey)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {points.length < 2 ? (
        <p className="py-10 text-center text-sm text-muted">
          {tr("act.needTwo")}
        </p>
      ) : (
        <>
          {corr != null && (
            <div className="mb-2 text-sm">
              {tr("act.correlation")}{" "}
              <span className={`font-semibold ${Math.abs(corr) > 0.5 ? "text-brand" : "text-muted"}`}>
                {corr.toFixed(2)}
              </span>{" "}
              <span className="text-muted">
                ({Math.abs(corr) > 0.7 ? tr("act.strong") : Math.abs(corr) > 0.4 ? tr("act.moderate") : tr("act.weak")})
              </span>
            </div>
          )}
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]">
              {/* assi */}
              <line x1={PAD} y1={H - PAD} x2={W - 8} y2={H - PAD} stroke="currentColor" strokeOpacity="0.2" />
              <line x1={PAD} y1={12} x2={PAD} y2={H - PAD} stroke="currentColor" strokeOpacity="0.2" />
              {/* etichette min/max */}
              <text x={PAD - 6} y={sy(yMax)} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.6">{yMax.toFixed(0)}</text>
              <text x={PAD - 6} y={sy(yMin)} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.6">{yMin.toFixed(0)}</text>
              {/* linea (solo serie temporale) */}
              {isTime && (
                <polyline
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth="2"
                  points={points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")}
                />
              )}
              {/* punti */}
              {points.map((p, i) => (
                <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="3.5" fill="var(--brand)">
                  <title>{`${p.label}: ${p.y.toFixed(1)}`}</title>
                </circle>
              ))}
              {/* etichette asse X */}
              <text x={PAD} y={H - PAD + 16} fontSize="10" fill="currentColor" opacity="0.6">
                {isTime ? points[0].label : xMin.toFixed(0)}
              </text>
              <text x={W - 8} y={H - PAD + 16} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.6">
                {isTime ? points[points.length - 1].label : xMax.toFixed(0)}
              </text>
            </svg>
          </div>
          <div className="mt-1 text-center text-xs text-muted">
            {isTime ? tr("act.time") : tr(METRICS[xAxis as MetricKey].labelKey)} → {tr(METRICS[yAxis].labelKey)}
          </div>
        </>
      )}
    </div>
  );
}
