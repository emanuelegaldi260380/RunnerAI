import Link from "next/link";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { COMPANY, companyAddressLine } from "@/lib/legal/company";
import CookiePreferencesButton from "@/components/CookiePreferencesButton";

/**
 * Footer condiviso con i dati identificativi ex D.Lgs. 70/2003 art. 7 e i link
 * ai documenti legali. Usato in tutte le aree del sito (landing, app, legal).
 */
export default async function SiteFooter() {
  const lang = await getServerLang();
  const tt = (k: string) => t(lang, k);

  return (
    <footer className="border-t border-border bg-surface px-5 py-10 text-sm text-muted sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="font-bold text-foreground">
            Runner<span className="text-brand">AI</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-4">
            <Link href="/terms" className="hover:text-foreground">{tt("foot.terms")}</Link>
            <Link href="/privacy" className="hover:text-foreground">{tt("foot.privacy")}</Link>
            <Link href="/cookie" className="hover:text-foreground">{tt("foot.cookie")}</Link>
            <Link href="/contatti" className="hover:text-foreground">{tt("foot.contact")}</Link>
            <Link href="/press" className="hover:text-foreground">{tt("foot.press")}</Link>
            <CookiePreferencesButton />
          </nav>
        </div>

        {/* Disclaimer legali */}
        <div className="mx-auto mt-6 max-w-3xl space-y-2 text-center text-xs leading-relaxed">
          <p>{tt("foot.health")}</p>
          <p>{tt("foot.ai")}</p>
          <p>{tt("foot.trademark")}</p>
        </div>

        {/* Dati identificativi del fornitore (D.Lgs. 70/2003, art. 7) */}
        <div className="mt-6 border-t border-border pt-4 text-center text-xs leading-relaxed">
          <p>
            © 2026 <b>{COMPANY.brand}</b> — {COMPANY.legalName}
            {COMPANY.legalForm ? ` · ${COMPANY.legalForm}` : ""}
          </p>
          <p>
            P.IVA {COMPANY.vat} · {COMPANY.rea} · {companyAddressLine()}
          </p>
          <p>
            PEC:{" "}
            <a href={`mailto:${COMPANY.pec}`} className="hover:text-foreground">
              {COMPANY.pec}
            </a>{" "}
            ·{" "}
            <a href={`mailto:${COMPANY.email.support}`} className="hover:text-foreground">
              {COMPANY.email.support}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
