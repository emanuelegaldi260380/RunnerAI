"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";

export default function PlanGenerator({
  initialPrompt,
  hasPlan,
}: {
  initialPrompt: string;
  hasPlan: boolean;
}) {
  const router = useRouter();
  const tr = useT();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPrompt: prompt }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? tr("c.error"));
      else router.refresh();
    } catch {
      setError(tr("c.retry"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card mb-6">
      <label className="label">{tr("plan.customLabel")}</label>
      <p className="mb-2 text-xs text-muted">
        {tr("plan.hintPre")} <b>{tr("plan.hintBold")}</b>{tr("plan.hintPost")}
      </p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder={tr("plan.promptPh")}
        className="input resize-y"
      />
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <button onClick={generate} className="btn-brand mt-3" disabled={loading}>
        {loading
          ? tr("plan.generating")
          : hasPlan
            ? tr("plan.regen")
            : tr("plan.generate")}
      </button>
    </div>
  );
}
