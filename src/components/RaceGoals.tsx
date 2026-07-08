"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";
import { nowMs } from "@/lib/time";

export interface Race {
  id: string;
  name: string;
  distanceKm: number;
  raceDate: string | null;
  targetTimeSec: number | null;
  priority: string;
}

function fmtTime(sec: number | null): string {
  if (!sec) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function parseTime(str: string): number | undefined {
  if (!str.trim()) return undefined;
  const parts = str.split(":").map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return undefined;
  let sec = 0;
  for (const p of parts) sec = sec * 60 + p;
  return sec;
}

const PRESETS: [string, number][] = [
  ["5 km", 5],
  ["10 km", 10],
  ["Mezza (21,097)", 21.097],
  ["Maratona (42,195)", 42.195],
];

export default function RaceGoals({ races }: { races: Race[] }) {
  const router = useRouter();
  const tt = useT();
  const [open, setOpen] = useState(races.length === 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      distanceKm: fd.get("distanceKm"),
      raceDate: fd.get("raceDate") || undefined,
      targetTimeSec: parseTime((fd.get("targetTime") as string) || ""),
      priority: fd.get("priority") || "A",
    };
    try {
      const res = await fetch("/api/races", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Errore");
      else {
        (e.target as HTMLFormElement).reset();
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError("Errore di rete");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/races/${id}`, { method: "DELETE" });
    router.refresh();
  }

  function daysTo(date: string | null): string {
    if (!date) return "";
    const d = Math.ceil((new Date(date).getTime() - nowMs()) / 86400000);
    if (d < 0) return "conclusa";
    if (d === 0) return "oggi";
    return `tra ${d} giorni`;
  }

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{tt("r.title")}</h2>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-sm font-medium text-brand hover:underline"
        >
          {open ? tt("r.close") : tt("r.add")}
        </button>
      </div>

      {races.length === 0 && !open && (
        <p className="text-sm text-muted">{tt("r.empty")}</p>
      )}

      {races.length > 0 && (
        <ul className="mb-3 space-y-2">
          {races.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <div>
                <div className="flex items-center gap-2 font-medium">
                  {r.name}
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">
                    {r.priority}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  {r.distanceKm} km
                  {r.raceDate &&
                    ` · ${new Date(r.raceDate).toLocaleDateString("it-IT")} (${daysTo(r.raceDate)})`}
                  {r.targetTimeSec ? ` · obiettivo ${fmtTime(r.targetTimeSec)}` : ""}
                </div>
              </div>
              <button
                onClick={() => remove(r.id)}
                aria-label="Rimuovi"
                className="text-muted hover:text-red-500"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form onSubmit={add} className="space-y-3 border-t border-border pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">{tt("r.name")}</label>
              <input name="name" className="input" placeholder="Es. Maratona di Roma" required />
            </div>
            <div>
              <label className="label">{tt("r.distance")}</label>
              <input
                name="distanceKm"
                type="number"
                step="0.001"
                className="input"
                list="race-presets"
                required
              />
              <datalist id="race-presets">
                {PRESETS.map(([l, v]) => (
                  <option key={v} value={v} label={l} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">{tt("r.date")}</label>
              <input name="raceDate" type="date" className="input" />
            </div>
            <div>
              <label className="label">{tt("r.target")}</label>
              <input name="targetTime" className="input" placeholder="03:30:00" />
            </div>
            <div>
              <label className="label">{tt("r.priority")}</label>
              <select name="priority" className="input" defaultValue="A">
                <option value="A">{tt("r.pA")}</option>
                <option value="B">{tt("r.pB")}</option>
                <option value="C">{tt("r.pC")}</option>
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-brand" disabled={saving}>
            {saving ? tt("r.saving") : tt("r.addBtn")}
          </button>
        </form>
      )}
    </div>
  );
}
