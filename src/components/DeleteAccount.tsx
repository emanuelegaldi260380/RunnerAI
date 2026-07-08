"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useT } from "@/components/LangProvider";

export default function DeleteAccount() {
  const tr = useT();
  const keyword = tr("acct.deleteKeyword");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? tr("c.error"));
        setLoading(false);
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setError(tr("c.retry"));
      setLoading(false);
    }
  }

  return (
    <div className="card border-red-500/40">
      <h3 className="mb-1 font-semibold text-red-500">{tr("acct.deleteTitle")}</h3>
      <p className="mb-3 text-sm text-muted">
        {tr("acct.deleteDesc1")}<b>{tr("acct.deleteBold1")}</b>{tr("acct.deleteDesc2")}
        <b>{tr("acct.deleteBold2")}</b>{tr("acct.deleteDesc3")}<b>{keyword}</b>{tr("acct.deleteDesc4")}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input max-w-[200px]"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={keyword}
        />
        <button
          onClick={remove}
          disabled={confirm !== keyword || loading}
          className="rounded-full bg-red-500 px-5 py-2.5 font-semibold text-white transition hover:bg-red-600 disabled:opacity-40"
        >
          {loading ? tr("acct.deleting") : tr("acct.deleteBtn")}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
