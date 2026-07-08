import { COMPANY, companyAddressLine } from "@/lib/legal/company";

export const metadata = { title: "Contatti e dati societari — RunnerAI" };

export default function ContactPage() {
  return (
    <div className="prose-legal">
      <h1>Contatti e dati societari</h1>
      <p className="lead">
        Dati identificativi del fornitore del servizio ai sensi dell&apos;art. 7
        del D.Lgs. 70/2003 (commercio elettronico).
      </p>

      <div className="card not-prose mt-4">
        <h2 className="!mt-0">Fornitore del servizio</h2>
        <p className="text-sm">
          <b>{COMPANY.legalName}</b>
          {COMPANY.legalForm ? ` — ${COMPANY.legalForm}` : ""}
          <br />
          Nome commerciale: {COMPANY.brand}
          <br />
          Sede legale: {companyAddressLine()}
          <br />
          P.IVA: <b>{COMPANY.vat}</b>
          {COMPANY.taxCode ? (
            <>
              <br />
              Codice Fiscale: {COMPANY.taxCode}
            </>
          ) : null}
          <br />
          Iscrizione Registro Imprese / REA: {COMPANY.rea}
          {COMPANY.shareCapital ? (
            <>
              <br />
              Capitale sociale: {COMPANY.shareCapital}
            </>
          ) : null}
        </p>
      </div>

      <div className="card not-prose mt-4">
        <h2 className="!mt-0">Contatti</h2>
        <ul className="space-y-1 text-sm">
          <li>
            PEC:{" "}
            <a href={`mailto:${COMPANY.pec}`}>{COMPANY.pec}</a>
          </li>
          <li>
            Supporto:{" "}
            <a href={`mailto:${COMPANY.email.support}`}>{COMPANY.email.support}</a>
          </li>
          <li>
            Privacy / GDPR:{" "}
            <a href={`mailto:${COMPANY.email.privacy}`}>{COMPANY.email.privacy}</a>
          </li>
        </ul>
      </div>

      <h2>Risoluzione delle controversie (ODR)</h2>
      <p>
        Ai sensi del Reg. UE 524/2013, il consumatore può ricorrere alla
        piattaforma europea di risoluzione online delle controversie (ODR),
        disponibile all&apos;indirizzo{" "}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
          ec.europa.eu/consumers/odr
        </a>
        .
      </p>

      <p className="text-xs text-muted">
        ⚠️ I dati sopra riportati contengono segnaposto: vanno sostituiti con i
        dati reali del fornitore prima della pubblicazione.
      </p>
    </div>
  );
}
