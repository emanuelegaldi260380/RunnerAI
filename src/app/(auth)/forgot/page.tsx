"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/components/LangProvider";

export default function ForgotPage() {
  const tr = useT();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-xl font-bold">
          Runner<span className="text-brand">AI</span>
        </Link>
        <div className="card">
          <h1 className="mb-1 text-2xl font-bold">{tr("forgot.title")}</h1>
          {sent ? (
            <p className="mt-3 text-sm text-muted">{tr("forgot.sent")}</p>
          ) : (
            <>
              <p className="mb-6 text-sm text-muted">{tr("forgot.desc")}</p>
              <form onSubmit={submit} className="space-y-4">
                <input
                  type="email"
                  className="input"
                  placeholder={tr("forgot.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="btn-brand w-full" disabled={loading}>
                  {loading ? tr("forgot.sending") : tr("forgot.submit")}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/login" className="text-brand hover:underline">
            {tr("forgot.back")}
          </Link>
        </p>
      </div>
    </main>
  );
}
