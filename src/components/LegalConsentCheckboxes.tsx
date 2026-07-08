"use client";

import Link from "next/link";
import { useT } from "@/components/LangProvider";

/**
 * Le due caselle di consenso richieste in fase di registrazione:
 * 1) Termini + Privacy (obbligatoria)
 * 2) approvazione SPECIFICA e SEPARATA delle clausole vessatorie (art. 1341-1342 c.c.)
 */
export default function LegalConsentCheckboxes({
  acceptTerms,
  setAcceptTerms,
  acceptVexatious,
  setAcceptVexatious,
}: {
  acceptTerms: boolean;
  setAcceptTerms: (v: boolean) => void;
  acceptVexatious: boolean;
  setAcceptVexatious: (v: boolean) => void;
}) {
  const tr = useT();
  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          className="mt-1"
        />
        <span className="text-muted">
          {tr("reg.acceptTerms1")}{" "}
          <Link href="/terms" target="_blank" className="text-brand hover:underline">
            {tr("foot.terms")}
          </Link>{" "}
          {tr("reg.and")}{" "}
          <Link href="/privacy" target="_blank" className="text-brand hover:underline">
            {tr("foot.privacy")}
          </Link>
          .
        </span>
      </label>

      <label className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-sm">
        <input
          type="checkbox"
          checked={acceptVexatious}
          onChange={(e) => setAcceptVexatious(e.target.checked)}
          className="mt-1"
        />
        <span className="text-muted">
          {tr("reg.acceptVexatious")}{" "}
          <Link href="/terms#vessatorie" target="_blank" className="text-brand hover:underline">
            {tr("reg.vexatiousLink")}
          </Link>
          .
        </span>
      </label>
    </div>
  );
}
