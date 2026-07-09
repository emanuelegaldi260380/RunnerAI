"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/components/LangProvider";

function ResetInner() {
  const tr = useT();
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
      if (!res.ok) setError(data.error ?? tr("reset.error"));
      else {
        setOk(true);
        setTimeout(() => router.push("/login"), 1500);
      }
    } catch {
      setError(tr("reset.errorNet"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h1 className="mb-1 text-2xl font-bold">{tr("reset.title")}</h1>
      {!token ? (
        <p className="mt-3 text-sm text-red-500">{tr("reset.invalidLink")}</p>
      ) : ok ? (
        <p className="mt-3 text-sm text-green-600">{tr("reset.success")}</p>
      ) : (
        <>
          <p className="mb-6 text-sm text-muted">{tr("reset.desc")}</p>
          <form onSubmit={submit} className="space-y-4">
            <input
              type="password"
              className="input"
              placeholder={tr("reset.placeholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" className="btn-brand w-full" disabled={loading}>
              {loading ? tr("reset.loading") : tr("reset.submit")}
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
        <Suspense fallback={<ResetFallback />}>
          <ResetInner />
        </Suspense>
      </div>
    </main>
  );
}

function ResetFallback() {
  const tr = useT();
  return <div className="card text-muted">{tr("reset.loadingPage")}</div>;
}
