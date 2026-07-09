"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/LangProvider";
import Icon from "@/components/Icon";
import ConfirmDialog from "@/components/ConfirmDialog";

interface TokenRow {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiTokensCard() {
  const tr = useT();
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/settings/tokens");
      const d = await res.json();
      if (res.ok) setTokens(d.tokens ?? []);
    } catch {
      /* silenzioso */
    }
  }

  // Caricamento iniziale: fetch inline nell'effect, setState solo dopo l'await
  // (evita react-hooks/set-state-in-effect).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/settings/tokens");
        const d = await res.json();
        if (alive && res.ok) setTokens(d.tokens ?? []);
      } catch {
        /* silenzioso */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    setCreated(null);
    setCopied(false);
    try {
      const res = await fetch("/api/settings/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = await res.json();
      if (!res.ok) setError(d.error ?? tr("c.error"));
      else {
        setCreated(d.token);
        setName("");
        load();
      }
    } catch {
      setError(tr("c.retry"));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/settings/tokens/${id}`, { method: "DELETE" });
    load();
  }

  async function copy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created);
      setCopied(true);
    } catch {
      /* clipboard non disponibile */
    }
  }

  return (
    <div className="card">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <Icon name="key" size={18} className="text-brand" />
        {tr("tokens.title")}
      </h2>
      <p className="mb-4 text-sm text-muted">{tr("tokens.desc")}</p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1">
          <label className="label">{tr("tokens.name")}</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tr("tokens.namePlaceholder")}
            maxLength={60}
          />
        </div>
        <button onClick={create} disabled={busy} className="btn-brand">
          {busy ? tr("tokens.creating") : tr("tokens.create")}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {created && (
        <div
          className="mt-4 rounded-lg border border-brand/40 bg-brand/5 p-3"
          role="status"
          aria-live="polite"
        >
          <p className="mb-2 text-sm font-medium text-brand">{tr("tokens.copyOnce")}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-black/5 px-2 py-1.5 text-xs dark:bg-white/10">
              {created}
            </code>
            <button onClick={copy} className="btn-ghost !py-1.5 !text-xs">
              {copied ? tr("tokens.copied") : tr("tokens.copy")}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">{tr("tokens.mcpHint")}</p>
        </div>
      )}

      <div className="mt-4">
        {tokens.length === 0 ? (
          <p className="text-sm text-muted">{tr("tokens.none")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {tokens.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted">
                    <code>{t.prefix}…</code> · {tr("tokens.lastUsed")}:{" "}
                    {t.lastUsedAt
                      ? new Date(t.lastUsedAt).toLocaleDateString()
                      : tr("tokens.neverUsed")}
                  </div>
                </div>
                <button
                  onClick={() => setConfirmRevoke(t.id)}
                  className="focus-ring shrink-0 rounded px-1 text-sm font-medium text-red-600 hover:underline"
                >
                  {tr("tokens.revoke")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmRevoke && (
        <ConfirmDialog
          title={tr("tokens.revokeTitle")}
          body={tr("tokens.revokeBody")}
          confirmLabel={tr("tokens.revoke")}
          cancelLabel={tr("confirm.cancel")}
          danger
          onConfirm={async () => {
            await revoke(confirmRevoke);
            setConfirmRevoke(null);
          }}
          onClose={() => setConfirmRevoke(null)}
        />
      )}
    </div>
  );
}
