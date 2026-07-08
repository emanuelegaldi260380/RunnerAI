"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";

const CROSS_TRAINING: [string, string][] = [
  ["pliometria", "prof.crossPlyo"],
  ["ginnastica", "prof.crossGym"],
  ["pesi", "prof.crossWeights"],
  ["bicicletta", "prof.crossBike"],
  ["nuoto", "prof.crossSwim"],
  ["altro", "prof.crossOther"],
];

interface Props {
  initial: Record<string, string>;
  initialCross: string[];
}

export default function ProfileForm({ initial, initialCross }: Props) {
  const router = useRouter();
  const tr = useT();
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setOk(false);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const crossTraining = fd.getAll("crossTraining").map(String);
    const payload: Record<string, unknown> = {};
    fd.forEach((v, k) => {
      if (k !== "crossTraining" && v !== "") payload[k] = v.toString();
    });
    if (crossTraining.length) payload.crossTraining = crossTraining;
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? tr("c.error"));
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
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="card">
        <h3 className="mb-4 font-semibold">{tr("prof.personalData")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tr("prof.sex")} name="sex" type="select" defaultValue={initial.sex}
            options={[["", "—"], ["M", tr("prof.sexMale")], ["F", tr("prof.sexFemale")], ["other", tr("prof.sexOther")]]} />
          <Field label={tr("prof.birthDate")} name="birthDate" type="date" defaultValue={initial.birthDate} />
          <Field label={tr("prof.height")} name="heightCm" type="number" defaultValue={initial.heightCm} />
          <Field label={tr("prof.weight")} name="weightKg" type="number" step="0.1" defaultValue={initial.weightKg} />
          <Field label={tr("prof.restingHr")} name="restingHr" type="number" defaultValue={initial.restingHr} />
          <Field label={tr("prof.maxHr")} name="maxHr" type="number" defaultValue={initial.maxHr} />
        </div>
      </section>

      <section className="card">
        <h3 className="mb-4 font-semibold">{tr("prof.experienceSection")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tr("prof.level")} name="experience" type="select" defaultValue={initial.experience}
            options={[["", "—"], ["beginner", tr("prof.levBeginner")], ["intermediate", tr("prof.levIntermediate")], ["advanced", tr("prof.levAdvanced")], ["elite", tr("prof.levElite")]]} />
          <Field label={tr("prof.weeklyVolume")} name="weeklyVolumeKm" type="number" step="0.1" defaultValue={initial.weeklyVolumeKm} />
          <Field label={tr("prof.daysPerWeek")} name="daysPerWeek" type="number" min="1" max="7" defaultValue={initial.daysPerWeek} />
        </div>
      </section>

      <section className="card">
        <h3 className="mb-4 font-semibold">{tr("prof.goalSection")}</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={tr("prof.goalDistance")} name="goalRaceDistanceKm" type="number" step="0.1" defaultValue={initial.goalRaceDistanceKm} />
          <Field label={tr("prof.goalTargetTime")} name="goalTargetTimeSec" type="number" defaultValue={initial.goalTargetTimeSec} />
          <Field label={tr("prof.goalRaceDate")} name="goalRaceDate" type="date" defaultValue={initial.goalRaceDate} />
        </div>
        <p className="mt-2 text-xs text-muted">
          {tr("prof.goalHint")}
        </p>
      </section>

      <section className="card">
        <h3 className="mb-1 font-semibold">{tr("prof.crossSection")}</h3>
        <p className="mb-4 text-sm text-muted">
          {tr("prof.crossDesc")}
        </p>
        <div className="mb-4">
          <label className="label">{tr("prof.otherSportsLabel")}</label>
          <input
            name="otherSports"
            className="input"
            defaultValue={initial.otherSports}
            placeholder={tr("prof.otherSportsPh")}
          />
        </div>
        <label className="label">
          {tr("prof.crossLabel")}
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CROSS_TRAINING.map(([value, labelKey]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/5"
            >
              <input
                type="checkbox"
                name="crossTraining"
                value={value}
                defaultChecked={initialCross.includes(value)}
                className="accent-brand"
              />
              {tr(labelKey)}
            </label>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {ok && <p className="text-sm text-green-500">{tr("prof.saved")}</p>}
      <button type="submit" className="btn-brand" disabled={saving}>
        {saving ? tr("c.saving") : tr("prof.save")}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  defaultValue,
  options,
  step,
  min,
  max,
}: {
  label: string;
  name: string;
  type: string;
  defaultValue?: string;
  options?: [string, string][];
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {type === "select" ? (
        <select name={name} defaultValue={defaultValue} className="input">
          {options?.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={type}
          step={step}
          min={min}
          max={max}
          defaultValue={defaultValue}
          className="input"
        />
      )}
    </div>
  );
}
