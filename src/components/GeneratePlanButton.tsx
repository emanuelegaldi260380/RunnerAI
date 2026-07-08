"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";

export default function GeneratePlanButton({
  label,
}: {
  label?: string;
}) {
  const router = useRouter();
  const tr = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plan/generate", { method: "POST" });
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
    <div>
      <button onClick={generate} className="btn-brand" disabled={loading}>
        {loading ? tr("plan.generating") : label ?? tr("plan.generate")}
      </button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
