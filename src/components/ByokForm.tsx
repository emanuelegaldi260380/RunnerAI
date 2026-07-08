"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";

const PROVIDERS = [
  { id: "claude", label: "Anthropic (Claude)", model: "claude-opus-4-8" },
  { id: "openai", label: "OpenAI (ChatGPT)", model: "gpt-4o" },
  { id: "deepseek", label: "DeepSeek", model: "deepseek-chat" },
];

export default function ByokForm({
  initial,
  allowed = true,
}: {
  initial: { provider: string; model: string; enabled: boolean; hasKey: boolean } | null;
  allowed?: boolean;
}) {
  const router = useRouter();
  const tr = useT();
  const [provider, setProvider] = useState(initial?.provider ?? "openai");
  const [model, setModel] = useState(
    initial?.model ?? PROVIDERS.find((p) => p.id === "openai")!.model,
  );
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function onProviderChange(id: string) {
    setProvider(id);
    setModel(PROVIDERS.find((p) => p.id === id)?.model ?? "");
  }

  async function save() {
    setBusy("save");
    setMsg(null);
    try {
      const res = await fetch("/api/settings/llm-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, apiKey, enabled }),
      });
      const d = await res.json();
      setMsg(res.ok ? tr("byok.savedMsg") : `✗ ${d.error}`);
      if (res.ok) {
        setApiKey("");
        router.refresh();
      }
    } catch {
      setMsg(tr("byok.netErr"));
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    setMsg(null);
    try {
      const res = await fetch("/api/settings/llm-key/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiKey ? { provider, model, apiKey } : {}),
      });
      const d = await res.json();
      setMsg(res.ok ? tr("byok.keyValid") : `✗ ${d.error}`);
    } catch {
      setMsg(tr("byok.netErr"));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("remove");
    setMsg(null);
    try {
      await fetch("/api/settings/llm-key", { method: "DELETE" });
      setMsg(tr("byok.keyRemoved"));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card">
      <h3 className="mb-1 font-semibold">{tr("byok.title")}</h3>
      <p className="mb-4 text-sm text-muted">
        {tr("byok.desc1")}<b>{tr("byok.descBold1")}</b>{tr("byok.desc2")}
        <b>{tr("byok.descBold2")}</b>{tr("byok.desc3")}
      </p>

      {!allowed && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {tr("byok.proNotice1")}<b>{tr("byok.proBold")}</b>{tr("byok.proNotice2")}
        </div>
      )}

      <fieldset disabled={!allowed} className={!allowed ? "pointer-events-none opacity-50" : ""}>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">{tr("byok.provider")}</label>
          <select
            className="input"
            value={provider}
            onChange={(e) => onProviderChange(e.target.value)}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{tr("byok.model")}</label>
          <input
            className="input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={tr("byok.modelPh")}
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="label">{tr("byok.apiKey")}</label>
        <input
          type="password"
          className="input"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="off"
          placeholder={initial?.hasKey ? tr("byok.apiKeyPhSaved") : tr("byok.apiKeyPh")}
        />
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="accent-brand"
        />
        {tr("byok.useMyKey")}
      </label>

      {msg && (
        <p className={`mt-3 text-sm ${msg.startsWith("✓") ? "text-green-600" : msg.startsWith("✗") ? "text-red-500" : "text-muted"}`}>
          {msg}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={save} className="btn-brand" disabled={busy !== null}>
          {busy === "save" ? tr("c.saving") : tr("c.save")}
        </button>
        <button onClick={test} className="btn-ghost" disabled={busy !== null}>
          {busy === "test" ? tr("integ.testShort") : tr("byok.testKey")}
        </button>
        {initial?.hasKey && (
          <button onClick={remove} className="text-sm text-red-500 hover:underline" disabled={busy !== null}>
            {tr("byok.removeKey")}
          </button>
        )}
      </div>

      </fieldset>
    </div>
  );
}
