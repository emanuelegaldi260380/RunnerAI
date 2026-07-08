"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";

export default function RunAgentButton({
  endpoint,
  label,
  runningLabel,
}: {
  endpoint: string;
  label: string;
  runningLabel?: string;
}) {
  const router = useRouter();
  const tr = useT();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setMsg(data.error ?? tr("c.error"));
      else {
        setMsg(
          `${tr("run.donePre")} ${data.found ?? 0}, ${tr("run.saved")} ${data.saved ?? 0}${
            data.usedWebSearch === false ? tr("run.demoMode") : ""
          }`,
        );
        router.refresh();
      }
    } catch {
      setMsg(tr("c.retry"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={run} className="btn-ghost" disabled={loading}>
        {loading ? runningLabel ?? tr("run.running") : label}
      </button>
      {msg && <span className="text-sm text-muted">{msg}</span>}
    </div>
  );
}
