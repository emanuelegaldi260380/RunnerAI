"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/LangProvider";

// Versione del consenso: incrementare per richiedere di nuovo il consenso se
// cambiano le categorie/finalità.
const CONSENT_VERSION = 1;
const STORAGE_KEY = "cookie-consent";

type Consent = {
  v: number;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  ts: string;
};

function persist(consent: Consent) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    // cookie leggibile lato server (1 anno) per la prova del consenso
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(
      JSON.stringify({ a: consent.analytics, m: consent.marketing, v: consent.v }),
    )}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* no-op */
  }
}

export default function CookieConsent() {
  const tr = useT();
  const [show, setShow] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = raw ? (JSON.parse(raw) as Consent) : null;
      // Inizializzazione al mount da localStorage (non disponibile in SSR):
      // il setState sincrono qui è voluto e non causa render a cascata visibili.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!saved || saved.v !== CONSENT_VERSION) setShow(true);
      else {
        setAnalytics(!!saved.analytics);
        setMarketing(!!saved.marketing);
      }
    } catch {
      setShow(true);
    }
    // riapertura da "Gestisci cookie" (footer / cookie policy)
    const reopen = () => {
      setCustomize(true);
      setShow(true);
    };
    window.addEventListener("open-cookie-preferences", reopen);
    return () => window.removeEventListener("open-cookie-preferences", reopen);
  }, []);

  function save(a: boolean, m: boolean) {
    persist({
      v: CONSENT_VERSION,
      necessary: true,
      analytics: a,
      marketing: m,
      ts: new Date().toISOString(),
    });
    setAnalytics(a);
    setMarketing(m);
    setShow(false);
    setCustomize(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/97 backdrop-blur"
      role="dialog"
      aria-modal="false"
      aria-label={tr("cookie.title")}
    >
      <div className="mx-auto max-w-4xl px-5 py-4 text-sm">
        {!customize ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted">
              {tr("cookie.text")}{" "}
              <Link href="/cookie" className="text-brand hover:underline">
                {tr("cookie.policy")}
              </Link>
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              {/* Rifiuta agevole quanto Accetta (stessa evidenza) */}
              <button onClick={() => save(false, false)} className="btn-ghost px-4 py-2 text-sm">
                {tr("cookie.rejectAll")}
              </button>
              <button onClick={() => setCustomize(true)} className="btn-ghost px-4 py-2 text-sm">
                {tr("cookie.customize")}
              </button>
              <button onClick={() => save(true, true)} className="btn-brand px-4 py-2 text-sm">
                {tr("cookie.acceptAll")}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-semibold text-foreground">{tr("cookie.title")}</p>

            <label className="flex items-start gap-3 opacity-70">
              <input type="checkbox" checked disabled className="mt-1" />
              <span>
                <b>{tr("cookie.catNecessary")}</b> — {tr("cookie.catNecessaryDesc")}
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1"
              />
              <span>
                <b>{tr("cookie.catAnalytics")}</b> — {tr("cookie.catAnalyticsDesc")}
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-1"
              />
              <span>
                <b>{tr("cookie.catMarketing")}</b> — {tr("cookie.catMarketingDesc")}
              </span>
            </label>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button onClick={() => save(false, false)} className="btn-ghost px-4 py-2 text-sm">
                {tr("cookie.rejectAll")}
              </button>
              <button onClick={() => save(analytics, marketing)} className="btn-brand px-4 py-2 text-sm">
                {tr("cookie.savePrefs")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
