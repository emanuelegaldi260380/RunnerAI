"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useT } from "@/components/LangProvider";
import LegalConsentCheckboxes from "@/components/LegalConsentCheckboxes";

export default function RegisterForm() {
  const router = useRouter();
  const tr = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptVexatious, setAcceptVexatious] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Robustezza password: 0 (vuota) → 3 (forte). Heuristica su lunghezza + varietà.
  function pwScore(pw: string): 0 | 1 | 2 | 3 {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (pw.length >= 12) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return Math.min(s, 3) as 0 | 1 | 2 | 3;
  }
  const score = pwScore(password);
  const scoreLabel = ["", tr("reg.pwWeak"), tr("reg.pwMedium"), tr("reg.pwStrong")][score];
  const scoreColor = ["", "bg-red-500", "bg-amber-500", "bg-green-500"][score];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, acceptTerms, acceptVexatious }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? tr("reg.errorGeneric"));
        setLoading(false);
        return;
      }
      await signIn("credentials", { email, password, redirect: false });
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(tr("reg.errorNet"));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">{tr("reg.name")}</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="label">{tr("reg.email")}</label>
        <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="label">{tr("reg.password")}</label>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          aria-describedby="pw-hint pw-strength"
        />
        {password ? (
          <div id="pw-strength" className="mt-2" aria-live="polite">
            <div className="flex gap-1" aria-hidden="true">
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition ${
                    i <= score ? scoreColor : "bg-border"
                  }`}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">
              {tr("reg.pwStrength")}: <span className="font-medium">{scoreLabel}</span>
            </p>
          </div>
        ) : (
          <p id="pw-hint" className="mt-1 text-xs text-muted">
            {tr("reg.passwordHint")}
          </p>
        )}
      </div>
      <LegalConsentCheckboxes
        acceptTerms={acceptTerms}
        setAcceptTerms={setAcceptTerms}
        acceptVexatious={acceptVexatious}
        setAcceptVexatious={setAcceptVexatious}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        className="btn-brand w-full"
        disabled={loading || !acceptTerms || !acceptVexatious}
      >
        {loading ? tr("reg.loading") : tr("reg.submit")}
      </button>
    </form>
  );
}
