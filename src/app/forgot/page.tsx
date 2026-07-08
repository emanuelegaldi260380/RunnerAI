"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPage() {
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
          <h1 className="mb-1 text-2xl font-bold">Password dimenticata</h1>
          {sent ? (
            <p className="mt-3 text-sm text-muted">
              Se esiste un account con questa email, ti abbiamo inviato un link
              per reimpostare la password. Controlla la posta.
            </p>
          ) : (
            <>
              <p className="mb-6 text-sm text-muted">
                Inserisci la tua email: ti invieremo un link per reimpostare la
                password.
              </p>
              <form onSubmit={submit} className="space-y-4">
                <input
                  type="email"
                  className="input"
                  placeholder="La tua email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="btn-brand w-full" disabled={loading}>
                  {loading ? "Invio…" : "Invia link di reset"}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/login" className="text-brand hover:underline">
            Torna al login
          </Link>
        </p>
      </div>
    </main>
  );
}
