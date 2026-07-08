"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";

type Zone = { min: string; max: string };
type Zones = Record<"z1" | "z2" | "z3" | "z4" | "z5", Zone>;

const ZONE_META: { key: keyof Zones; labelKey: string; descKey: string; pct: [number, number] }[] = [
  { key: "z1", labelKey: "hr.z1", descKey: "hr.z1d", pct: [0.5, 0.6] },
  { key: "z2", labelKey: "hr.z2", descKey: "hr.z2d", pct: [0.6, 0.7] },
  { key: "z3", labelKey: "hr.z3", descKey: "hr.z3d", pct: [0.7, 0.8] },
  { key: "z4", labelKey: "hr.z4", descKey: "hr.z4d", pct: [0.8, 0.9] },
  { key: "z5", labelKey: "hr.z5", descKey: "hr.z5d", pct: [0.9, 1.0] },
];

export default function HrZonesForm({
  initial,
  maxHr,
}: {
  initial: Partial<Record<keyof Zones, { min?: number; max?: number }>> | null;
  maxHr: number | null;
}) {
  const router = useRouter();
  const tr = useT();
  const [zones, setZones] = useState<Zones>(() => {
    const z = {} as Zones;
    for (const { key } of ZONE_META) {
      z[key] = {
        min: initial?.[key]?.min?.toString() ?? "",
        max: initial?.[key]?.max?.toString() ?? "",
      };
    }
    return z;
  });
  const [maxHrInput, setMaxHrInput] = useState(maxHr?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function autoCalc() {
    const mh = parseInt(maxHrInput, 10);
    if (!mh || mh < 100) {
      setError(tr("hr.autoErr"));
      return;
    }
    setError(null);
    const z = {} as Zones;
    for (const { key, pct } of ZONE_META) {
      z[key] = {
        min: Math.round(mh * pct[0]).toString(),
        max: Math.round(mh * pct[1]).toString(),
      };
    }
    setZones(z);
  }

  function update(key: keyof Zones, field: "min" | "max", value: string) {
    setZones((z) => ({ ...z, [key]: { ...z[key], [field]: value } }));
  }

  async function save() {
    setSaving(true);
    setOk(false);
    setError(null);
    const payload: Record<string, { min?: number; max?: number }> = {};
    for (const { key } of ZONE_META) {
      const min = parseInt(zones[key].min, 10);
      const max = parseInt(zones[key].max, 10);
      payload[key] = {
        ...(isNaN(min) ? {} : { min }),
        ...(isNaN(max) ? {} : { max }),
      };
    }
    try {
      const res = await fetch("/api/hr-zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) setError(tr("c.saveErr"));
      else {
        setOk(true);
        router.refresh();
      }
    } catch {
      setError(tr("c.retry"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h3 className="mb-1 font-semibold">{tr("hr.title")}</h3>
      <p className="mb-4 text-sm text-muted">
        {tr("hr.desc")}
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg bg-surface p-3">
        <div>
          <label className="label">{tr("hr.maxHr")}</label>
          <input
            type="number"
            className="input w-32"
            value={maxHrInput}
            onChange={(e) => setMaxHrInput(e.target.value)}
            placeholder={tr("hr.maxHrPh")}
          />
        </div>
        <button type="button" onClick={autoCalc} className="btn-ghost">
          {tr("hr.autoCalc")}
        </button>
      </div>

      <div className="space-y-2">
        {ZONE_META.map((z) => (
          <div key={z.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
            <div>
              <div className="text-sm font-medium">{tr(z.labelKey)}</div>
              <div className="text-xs text-muted">{tr(z.descKey)}</div>
            </div>
            <input
              type="number"
              className="input w-24"
              placeholder={tr("hr.min")}
              value={zones[z.key].min}
              onChange={(e) => update(z.key, "min", e.target.value)}
            />
            <input
              type="number"
              className="input w-24"
              placeholder={tr("hr.max")}
              value={zones[z.key].max}
              onChange={(e) => update(z.key, "max", e.target.value)}
            />
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {ok && <p className="mt-3 text-sm text-green-600">{tr("hr.saved")}</p>}
      <button onClick={save} className="btn-brand mt-4" disabled={saving}>
        {saving ? tr("c.saving") : tr("hr.save")}
      </button>
    </div>
  );
}
