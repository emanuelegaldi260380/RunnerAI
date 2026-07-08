"use client";

import { useEffect, useState } from "react";

// Modulo 2 — "Il tuo motore": profilo fisiologico derivato dai dati reali.

interface Zone {
  min: number;
  max: number;
}
interface Profile {
  activitiesUsed: number;
  maxHr: number | null;
  restingHr: number | null;
  lthr: number | null;
  thresholdPaceSecPerKm: number | null;
  hrZones: Record<string, Zone> | null;
  decouplingPct: number | null;
  durabilityPct: number | null;
  vo2max: number | null;
  heatSlopePctPerDewC: number | null;
  summary: string | null;
  computedAt?: string;
}

const pace = (s: number | null | undefined) =>
  s == null ? "—" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}/km`;

const ZONE_LABELS: Record<string, string> = {
  z1: "Z1 · Recupero",
  z2: "Z2 · Aerobico",
  z3: "Z3 · Tempo",
  z4: "Z4 · Soglia",
  z5: "Z5 · VO₂max",
};

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-lg font-bold">{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}

export default function PhysiologyTwin() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/physiology")
      .then((r) => r.json())
      .then((d) => setProfile(d.profile))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function recompute() {
    setComputing(true);
    setError(null);
    try {
      const res = await fetch("/api/physiology", { method: "POST" });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Errore nel calcolo");
      } else {
        setProfile(d.profile);
      }
    } catch {
      setError("Errore di rete");
    }
    setComputing(false);
  }

  if (loading) return null;

  const empty = !profile;

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">🧬 Il tuo Gemello Fisiologico</h2>
          <p className="text-sm text-muted">
            Il profilo del tuo motore, ricavato dai tuoi dati reali — non da tabelle generiche.
          </p>
        </div>
        <button onClick={recompute} disabled={computing} className="btn-ghost shrink-0 text-sm">
          {computing ? "Calcolo…" : empty ? "Calcola" : "Ricalcola"}
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-red-500">{error}</p>}

      {empty ? (
        <p className="text-sm text-muted">
          Nessun profilo ancora. Sincronizza i tuoi dati Garmin e premi <b>Calcola</b>: stimerò
          soglia, zone reali, resistenza aerobica (decoupling), tenuta in fatica e risposta al caldo.
        </p>
      ) : (
        <div className="space-y-4">
          {profile!.summary && (
            <p className="rounded-lg bg-brand/5 p-3 text-sm">{profile!.summary}</p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Soglia (LT2)" value={profile!.lthr ? `${profile!.lthr} bpm` : "—"} hint={pace(profile!.thresholdPaceSecPerKm)} />
            <Metric label="FCmax osservata" value={profile!.maxHr ? `${profile!.maxHr} bpm` : "—"} />
            <Metric label="FC riposo" value={profile!.restingHr ? `${profile!.restingHr} bpm` : "—"} />
            <Metric label="VO₂max" value={profile!.vo2max ? `${profile!.vo2max}` : "—"} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric
              label="Decoupling (lunghi)"
              value={profile!.decouplingPct != null ? `${profile!.decouplingPct}%` : "—"}
              hint="resistenza aerobica"
            />
            <Metric
              label="Fade del passo"
              value={profile!.durabilityPct != null ? `${profile!.durabilityPct}%` : "—"}
              hint="tenuta in fatica"
            />
            <Metric
              label="Sensibilità al caldo"
              value={profile!.heatSlopePctPerDewC != null ? `${profile!.heatSlopePctPerDewC}%/°C` : "—"}
              hint="per °C di dew point"
            />
          </div>

          {profile!.hrZones && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted">Zone HR reali (da soglia)</div>
              <div className="space-y-1">
                {Object.entries(profile!.hrZones).map(([k, z]) => (
                  <div key={k} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm">
                    <span>{ZONE_LABELS[k] ?? k}</span>
                    <span className="font-medium tabular-nums">
                      {z.min}–{z.max} bpm
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile!.computedAt && (
            <p className="text-xs text-muted">
              Aggiornato: {new Date(profile!.computedAt).toLocaleDateString("it-IT")} · {profile!.activitiesUsed} attività
            </p>
          )}
        </div>
      )}
    </div>
  );
}
