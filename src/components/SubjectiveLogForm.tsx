"use client";

import { useState } from "react";

// Modulo 4 — cattura soggettiva a bassissimo attrito. Da riempire ogni giorno:
// senza storia la mappatura soggettivo↔oggettivo non ha valore.

function Scale({
  label,
  value,
  onChange,
  max,
  lowHint,
  highHint,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  max: number;
  lowHint: string;
  highHint: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted">
          {lowHint} → {highHint}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-9 w-9 rounded-lg border text-sm transition ${
              value === n
                ? "border-brand bg-brand text-brand-fg font-semibold"
                : "border-border hover:border-brand"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SubjectiveLogForm() {
  const [rpe, setRpe] = useState<number | null>(null);
  const [legs, setLegs] = useState<number | null>(null);
  const [sleepP, setSleepP] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [niggle, setNiggle] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nothing = rpe === null && legs === null && sleepP === null && mood === null && !niggle;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/subjective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rpe, legs, sleepPerceived: sleepP, mood, niggle: niggle || undefined }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Errore nel salvataggio");
        setSaving(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Errore di rete");
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="card">
        <h2 className="mb-1 font-semibold">Come ti senti oggi</h2>
        <p className="text-sm text-muted">
          ✓ Registrato. Ogni giorno che lo compili, RunnerAI impara la <b>tua</b> relazione
          tra come ti senti e come rendi.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="mb-1 font-semibold">Come ti senti oggi</h2>
      <p className="mb-4 text-sm text-muted">
        Pochi tap. Serve a imparare la tua mappatura sensazioni ↔ performance.
      </p>
      <div className="space-y-4">
        <Scale label="Sforzo percepito (RPE)" value={rpe} onChange={setRpe} max={10} lowHint="1 facile" highHint="10 massimo" />
        <Scale label="Gambe" value={legs} onChange={setLegs} max={5} lowHint="1 morte" highHint="5 brillanti" />
        <Scale label="Sonno percepito" value={sleepP} onChange={setSleepP} max={5} lowHint="1 pessimo" highHint="5 ottimo" />
        <Scale label="Umore / stress" value={mood} onChange={setMood} max={5} lowHint="1 giù" highHint="5 su" />
        <div>
          <label className="label">Fastidi / acciacchi (opzionale)</label>
          <input
            className="input"
            value={niggle}
            onChange={(e) => setNiggle(e.target.value)}
            placeholder="es. tensione polpaccio dx"
            maxLength={300}
          />
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <button onClick={submit} disabled={saving || nothing} className="btn-brand mt-4 w-full">
        {saving ? "Salvo…" : "Registra"}
      </button>
    </div>
  );
}
