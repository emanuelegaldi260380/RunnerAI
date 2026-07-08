"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";

export default function GarminConnectForm() {
  const router = useRouter();
  const tr = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  async function testConn() {
    setTesting(true);
    setTestMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/integrations/garmin/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      setTestMsg(res.ok ? tr("integ.connSuccess") : `✗ ${data.error}`);
    } catch {
      setTestMsg("✗ " + tr("c.retry"));
    } finally {
      setTesting(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/garmin/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? tr("c.error"));
      else {
        setPassword("");
        router.refresh();
      }
    } catch {
      setError(tr("c.retry"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">{tr("integ.garminEmail")}</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            required
          />
        </div>
        <div>
          <label className="label">{tr("integ.garminPassword")}</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
      </div>
      <p className="text-xs text-muted">{tr("integ.garminNotice")}</p>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {testMsg && (
        <p className={`text-sm ${testMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
          {testMsg}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-brand" disabled={loading}>
          {loading ? tr("integ.connecting") : tr("integ.connectGarmin")}
        </button>
        <button
          type="button"
          onClick={testConn}
          className="btn-ghost"
          disabled={testing || !email || !password}
        >
          {testing ? tr("integ.testing") : tr("integ.testConn")}
        </button>
      </div>
    </form>
  );
}
