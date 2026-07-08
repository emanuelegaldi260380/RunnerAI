"use client";

import { useState } from "react";
import { useT } from "@/components/LangProvider";

export default function AdminUpgrade() {
  const tr = useT();
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState("pro");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tier }),
      });
      const data = await res.json();
      setMsg(
        res.ok
          ? `✓ ${data.email} ${tr("admin.setTo")} "${data.tier}"`
          : `${tr("c.error")}: ${data.error}`,
      );
    } catch {
      setMsg(tr("c.retry"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 className="mb-1 font-semibold">{tr("admin.upgradeTitle")}</h2>
      <p className="mb-3 text-sm text-muted">
        {tr("admin.upgradeDesc")}
      </p>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <label className="label">{tr("admin.userEmail")}</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="utente@example.com"
            required
          />
        </div>
        <div>
          <label className="label">{tr("admin.level")}</label>
          <select className="input" value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="trial">{tr("admin.lvlTrial")}</option>
            <option value="basic">{tr("admin.lvlBasic")}</option>
            <option value="pro">{tr("admin.lvlPro")}</option>
            <option value="none">{tr("admin.lvlNone")}</option>
          </select>
        </div>
        <button type="submit" className="btn-brand" disabled={loading}>
          {loading ? "…" : tr("admin.apply")}
        </button>
      </form>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </div>
  );
}
