"use client";

import { useState } from "react";
import GoogleButton from "@/components/GoogleButton";
import LegalConsentCheckboxes from "@/components/LegalConsentCheckboxes";
import { useT } from "@/components/LangProvider";

/**
 * Registrazione via Google con gate sui consensi obbligatori: il pulsante è
 * abilitato solo dopo aver accettato Termini/Privacy e approvato le clausole
 * vessatorie. La prova del consenso viene registrata lato server in
 * events.createUser (nuovi utenti OAuth). Vedi src/auth.ts.
 */
export default function GoogleRegister({ label }: { label: string }) {
  const tr = useT();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptVexatious, setAcceptVexatious] = useState(false);
  const ready = acceptTerms && acceptVexatious;

  return (
    <div className="space-y-4">
      <LegalConsentCheckboxes
        acceptTerms={acceptTerms}
        setAcceptTerms={setAcceptTerms}
        acceptVexatious={acceptVexatious}
        setAcceptVexatious={setAcceptVexatious}
      />
      <GoogleButton label={label} disabled={!ready} />
      {!ready && (
        <p className="text-center text-xs text-muted">{tr("reg.consentFirst")}</p>
      )}
    </div>
  );
}
