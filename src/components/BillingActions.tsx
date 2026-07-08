"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";

export default function BillingActions({
  configured,
  hasSubscription,
  cancelAtPeriodEnd = false,
}: {
  configured: boolean;
  hasSubscription: boolean;
  cancelAtPeriodEnd?: boolean;
}) {
  const tr = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? tr("c.error"));
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(tr("c.retry"));
      setLoading(false);
    }
  }

  async function setCancel(cancel: boolean) {
    if (cancel && !confirm(tr("bill.cancelConfirm"))) return;
    setCanceling(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? tr("c.error"));
        setCanceling(false);
        return;
      }
      router.refresh();
    } catch {
      setError(tr("c.retry"));
    }
    setCanceling(false);
  }

  if (!configured || !hasSubscription) {
    return <p className="text-sm text-muted">{tr("bill.manageAfter")}</p>;
  }

  return (
    <div className="space-y-3">
      {/* Disdetta online diretta e immediata (art. 54-bis Cod. Consumo) */}
      {cancelAtPeriodEnd ? (
        <div className="rounded-lg border border-border bg-surface p-3 text-sm">
          <p className="mb-2 text-muted">{tr("bill.cancelScheduled")}</p>
          <button
            onClick={() => setCancel(false)}
            disabled={canceling}
            className="btn-ghost text-sm"
          >
            {canceling ? tr("c.redirecting") : tr("bill.reactivate")}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCancel(true)}
          disabled={canceling}
          className="btn-ghost text-sm !border-red-300 !text-red-600 hover:!bg-red-50"
        >
          {canceling ? tr("c.redirecting") : tr("bill.cancelBtn")}
        </button>
      )}

      {/* Gestione metodo di pagamento / fatture (portale Stripe) */}
      <div>
        <button onClick={openPortal} className="btn-ghost text-sm" disabled={loading}>
          {loading ? tr("c.redirecting") : tr("bill.manageBtn")}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
