"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetInner() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Errore");
      else {
        setOk(true);
        setTimeout(() => router.push("/login"), 1500);
      }
    } catch {
      setError("Errore di rete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h1 className="mb-1 text-2xl font-bold">Nuova password</h1>
      {!token ? (
        <p className="mt-3 text-sm text-red-500">Link non valido.</p>
      ) : ok ? (
        <p className="mt-3 text-sm text-green-600">
          Password aggiornata! Reindirizzamento al login…
        </p>
      ) : (
        <>
          <p className="mb-6 text-sm text-muted">Scegli una nuova password (min 8 caratteri).</p>
          <form onSubmit={submit} className="space-y-4">
            <input
              type="password"
              className="input"
              placeholder="Nuova password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" className="btn-brand w-full" disabled={loading}>
              {loading ? "Aggiornamento…" : "Imposta password"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-xl font-bold">
          Runner<span className="text-brand">AI</span>
        </Link>
        <Suspense fallback={<div className="card text-muted">Caricamento…</div>}>
          <ResetInner />
        </Suspense>
      </div>
    </main>
  );
}
