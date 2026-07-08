"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";

export default function IntegrationActions({
  provider,
  connected,
  canSync,
}: {
  provider: "strava" | "garmin";
  connected: boolean;
  canSync: boolean;
}) {
  const router = useRouter();
  const tr = useT();
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function post(path: string, key: string) {
    setLoading(key);
    setMsg(null);
    try {
      const res = await fetch(path, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setMsg(data.error ?? tr("c.error"));
      else {
        if (typeof data.imported === "number")
          setMsg(`${tr("integ.importedPre")} ${data.imported} ${tr("integ.importedPost")}`);
        else if (key === "test") setMsg(tr("integ.connOk"));
        router.refresh();
      }
    } catch {
      setMsg(tr("c.retry"));
    } finally {
      setLoading(null);
    }
  }

  if (!connected) {
    return (
      <a href={`/api/integrations/${provider}/connect`} className="btn-brand">
        {tr("integ.connect")} {provider === "strava" ? "Strava" : "Garmin"}
      </a>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canSync && (
        <button
          onClick={() => post(`/api/integrations/${provider}/sync`, "sync")}
          className="btn-brand"
          disabled={loading !== null}
        >
          {loading === "sync" ? tr("integ.syncing") : tr("integ.syncNow")}
        </button>
      )}
      <button
        onClick={() => post(`/api/integrations/${provider}/test`, "test")}
        className="btn-ghost"
        disabled={loading !== null}
      >
        {loading === "test" ? tr("integ.testShort") : tr("integ.testConn")}
      </button>
      <button
        onClick={() => post(`/api/integrations/${provider}/disconnect`, "disc")}
        className="btn-ghost"
        disabled={loading !== null}
      >
        {loading === "disc" ? "…" : tr("integ.disconnect")}
      </button>
      {msg && <span className="text-sm text-muted">{msg}</span>}
    </div>
  );
}
