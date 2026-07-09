"use client";

import { useState } from "react";
import { useT } from "@/components/LangProvider";

// Modulo 4 — cattura soggettiva a bassissimo attrito. Da riempire ogni giorno:
// senza storia la mappatura soggettivo↔oggettivo non ha valore.

/**
 * Scala a selezione singola. Implementata come radiogroup accessibile
 * (WCAG 1.3.1 / 4.1.2): gruppo etichettato, `role="radio"` con `aria-checked`,
 * roving tabindex e navigazione con le frecce.
 */
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
  const items = Array.from({ length: max }, (_, i) => i + 1);

  function onKey(e: React.KeyboardEvent<HTMLButtonElement>, n: number) {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = n < max ? n + 1 : 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = n > 1 ? n - 1 : max;
    if (next !== null) {
      e.preventDefault();
      onChange(next);
      const el = e.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
        `[data-v="${next}"]`,
      );
      el?.focus();
    }
  }

  return (
    <div role="radiogroup" aria-label={`${label} (${lowHint} → ${highHint})`}>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted">
          {lowHint} → {highHint}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((n) => {
          const checked = value === n;
          // roving tabindex: tabbabile l'elemento selezionato, o il primo se nulla è selezionato
          const tabbable = checked || (value === null && n === 1);
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={checked}
              data-v={n}
              tabIndex={tabbable ? 0 : -1}
              onClick={() => onChange(n)}
              onKeyDown={(e) => onKey(e, n)}
              className={`focus-ring h-9 w-9 rounded-lg border text-sm transition ${
                checked
                  ? "border-brand bg-brand font-semibold text-brand-fg"
                  : "border-border hover:border-brand"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SubjectiveLogForm() {
  const tr = useT();
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
        setError(d.error ?? tr("subjlog.errSave"));
        setSaving(false);
        return;
      }
      setDone(true);
    } catch {
      setError(tr("subjlog.errNet"));
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="card">
        <h2 className="mb-1 font-semibold">{tr("subjlog.title")}</h2>
        <p className="text-sm text-muted">✓ {tr("subjlog.done")}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="mb-1 font-semibold">{tr("subjlog.title")}</h2>
      <p className="mb-4 text-sm text-muted">{tr("subjlog.subtitle")}</p>
      <div className="space-y-4">
        <Scale
          label={tr("subjlog.rpe")}
          value={rpe}
          onChange={setRpe}
          max={10}
          lowHint={tr("subjlog.rpeLow")}
          highHint={tr("subjlog.rpeHigh")}
        />
        <Scale
          label={tr("subjlog.legs")}
          value={legs}
          onChange={setLegs}
          max={5}
          lowHint={tr("subjlog.legsLow")}
          highHint={tr("subjlog.legsHigh")}
        />
        <Scale
          label={tr("subjlog.sleep")}
          value={sleepP}
          onChange={setSleepP}
          max={5}
          lowHint={tr("subjlog.sleepLow")}
          highHint={tr("subjlog.sleepHigh")}
        />
        <Scale
          label={tr("subjlog.mood")}
          value={mood}
          onChange={setMood}
          max={5}
          lowHint={tr("subjlog.moodLow")}
          highHint={tr("subjlog.moodHigh")}
        />
        <div>
          <label className="label" htmlFor="subjlog-niggle">
            {tr("subjlog.niggle")}
          </label>
          <input
            id="subjlog-niggle"
            className="input"
            value={niggle}
            onChange={(e) => setNiggle(e.target.value)}
            placeholder={tr("subjlog.nigglePh")}
            maxLength={300}
          />
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button onClick={submit} disabled={saving || nothing} className="btn-brand mt-4 w-full">
        {saving ? tr("subjlog.saving") : tr("subjlog.save")}
      </button>
    </div>
  );
}
