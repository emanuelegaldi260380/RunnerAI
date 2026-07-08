"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function IntegrationActions({
  provider,
  connected,
  canSync,
  canDeepSync = false,
}: {
  provider: "strava" | "garmin";
  connected: boolean;
  canSync: boolean;
  canDeepSync?: boolean;
}) {
  const router = useRouter();
  const tr = useT();
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDisc, setConfirmDisc] = useState(false);

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

  // Sync avanzato (deep-sync): estrae dati ricchi via bridge. Risposta = ImportSummary,
  // può richiedere minuti e segnalare la necessità di un login supervisionato (MFA).
  async function deepSync() {
    setLoading("deep");
    setMsg(null);
    try {
      const res = await fetch("/api/integrations/garmin/deep-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 90 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(
          data.needsSupervisedLogin
            ? tr("integ.deepSupervised")
            : data.error ?? tr("c.error"),
        );
      } else {
        setMsg(
          `${tr("integ.deepDone")} ${data.activities ?? 0} · 😴 ${data.sleepRecords ?? 0} · 📈 ${data.dailyMetrics ?? 0}`,
        );
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
      {canDeepSync && (
        <button
          onClick={deepSync}
          className="btn-ghost"
          disabled={loading !== null}
          title={tr("integ.deepSyncDesc")}
        >
          {loading === "deep" ? tr("integ.deepSyncing") : tr("integ.deepSync")}
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
        onClick={() => setConfirmDisc(true)}
        className="btn-ghost !border-red-300 !text-red-600 hover:!bg-red-50"
        disabled={loading !== null}
      >
        {loading === "disc" ? "…" : tr("integ.disconnect")}
      </button>
      {msg && (
        <span className="text-sm text-muted" role="status">
          {msg}
        </span>
      )}

      {confirmDisc && (
        <ConfirmDialog
          title={tr("integ.disconnectTitle")}
          body={tr("integ.disconnectBody")}
          confirmLabel={tr("integ.disconnect")}
          danger
          onConfirm={async () => {
            setConfirmDisc(false);
            await post(`/api/integrations/${provider}/disconnect`, "disc");
          }}
          onClose={() => setConfirmDisc(false)}
        />
      )}
    </div>
  );
}
