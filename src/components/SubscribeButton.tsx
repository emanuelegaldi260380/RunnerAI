"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/components/LangProvider";
import Modal from "@/components/Modal";

export default function SubscribeButton({
  tier,
  planName,
  priceLabel,
  variant = "brand",
}: {
  tier: "basic" | "pro";
  planName: string;
  priceLabel: string;
  variant?: "brand" | "ghost";
}) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [waiver, setWaiver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, withdrawalWaived: waiver }),
      });
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

  return (
    <>
      {/* CTA chiara, senza dark pattern */}
      <button
        onClick={() => setOpen(true)}
        className={`${variant === "brand" ? "btn-brand" : "btn-ghost"} w-full`}
      >
        {tr("pc.cta")} {planName}
      </button>

      {open && (
        <Modal onClose={() => !loading && setOpen(false)} title={tr("pc.title")}>
            {/* Informazioni precontrattuali (art. 48 Cod. Consumo) */}
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">{tr("pc.plan")}</dt>
                <dd className="font-semibold">{planName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{tr("pc.price")}</dt>
                <dd className="font-semibold">{priceLabel} {tr("pc.vatIncl")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{tr("pc.duration")}</dt>
                <dd className="text-right">{tr("pc.durationVal")}</dd>
              </div>
            </dl>

            <p className="mt-3 rounded-lg bg-surface p-3 text-xs leading-relaxed text-muted">
              {tr("pc.renewalInfo")}{" "}
              <Link href="/terms" target="_blank" className="text-brand hover:underline">
                {tr("foot.terms")}
              </Link>
              .
            </p>

            {/* Rinuncia esplicita al recesso 14gg per attivazione immediata (art. 59) */}
            <label className="mt-3 flex items-start gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={waiver}
                onChange={(e) => setWaiver(e.target.checked)}
                className="mt-0.5"
              />
              <span>{tr("pc.waiver")}</span>
            </label>
            <p className="mt-1 text-xs text-muted">{tr("pc.waiverHint")}</p>

            {error && (
              <p role="alert" className="mt-2 text-sm text-red-500">
                {error}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <button onClick={go} disabled={loading} className="btn-brand w-full">
                {loading ? tr("c.redirecting") : tr("pc.confirmBtn")}
              </button>
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="btn-ghost w-full"
              >
                {tr("pc.cancel")}
              </button>
            </div>
        </Modal>
      )}
    </>
  );
}
