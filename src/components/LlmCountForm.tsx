"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";

export default function LlmCountForm({
  initial,
  maxLlms,
}: {
  initial: number;
  maxLlms: number;
}) {
  const router = useRouter();
  const tr = useT();
  const [value, setValue] = useState(String(initial || 3));
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setOk(false);
    setError(null);
    try {
      const res = await fetch("/api/settings/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ llmCount: Number(value) }),
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

  const options = [
    { v: "1", label: tr("llm.opt1") },
    { v: "2", label: tr("llm.opt2") },
    { v: "3", label: tr("llm.opt3") },
  ];

  return (
    <div className="card">
      <h3 className="mb-1 font-semibold">{tr("llm.title")}</h3>
      <p className="mb-4 text-sm text-muted">
        {tr("llm.descPre")} <b>{maxLlms}</b> {tr("llm.descPost")}
      </p>
      <div className="space-y-2">
        {options.map((o) => {
          const disabled = Number(o.v) > maxLlms;
          return (
            <label
              key={o.v}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                disabled
                  ? "cursor-not-allowed border-border opacity-50"
                  : "cursor-pointer border-border has-[:checked]:border-brand has-[:checked]:bg-brand/5"
              }`}
            >
              <input
                type="radio"
                name="llmCount"
                value={o.v}
                checked={value === o.v}
                disabled={disabled}
                onChange={(e) => setValue(e.target.value)}
                className="accent-brand"
              />
              {o.label}
              {disabled && <span className="ml-auto text-xs text-muted">{tr("llm.requiresHigher")}</span>}
            </label>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {ok && <p className="mt-3 text-sm text-green-600">{tr("llm.saved")}</p>}
      <button onClick={save} className="btn-brand mt-4" disabled={saving}>
        {saving ? tr("c.saving") : tr("c.save")}
      </button>
    </div>
  );
}
