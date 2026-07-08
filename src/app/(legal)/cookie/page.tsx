import { LEGAL_LAST_UPDATED } from "@/lib/legal/company";
import CookiePreferencesButton from "@/components/CookiePreferencesButton";

export const metadata = { title: "Cookie Policy — RunnerAI" };

export default function CookiePage() {
  return (
    <div className="prose-legal">
      <h1>Cookie Policy</h1>
      <p className="text-sm text-muted">Ultimo aggiornamento: {LEGAL_LAST_UPDATED}</p>
      <p className="rounded-lg bg-brand/5 p-3 text-sm">
        Informativa sui cookie ai sensi delle Linee guida del Garante Privacy
        (10 giugno 2021). ⚠️ Modello da far revisionare a un legale.
      </p>

      <h2>1. Cosa sono i cookie</h2>
      <p>
        I cookie sono piccoli file salvati sul tuo dispositivo per far funzionare
        il sito, ricordare preferenze ed, eventualmente, effettuare misurazioni.
      </p>

      <h2>2. Categorie di cookie</h2>
      <table>
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Finalità</th>
            <th>Consenso</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>Tecnici / necessari</b></td>
            <td>
              Sessione di autenticazione (Auth.js), preferenza lingua
              (<code>lang</code>), memorizzazione delle scelte sui cookie.
            </td>
            <td>Non richiesto (indispensabili)</td>
          </tr>
          <tr>
            <td><b>Analitici</b></td>
            <td>Misurazione aggregata dell&apos;uso del sito per migliorarlo.</td>
            <td>Richiesto (disattivi per default)</td>
          </tr>
          <tr>
            <td><b>Marketing / profilazione</b></td>
            <td>Personalizzazione di contenuti e annunci di terze parti.</td>
            <td>Richiesto (disattivi per default)</td>
          </tr>
        </tbody>
      </table>
      <p>
        Allo stato attuale il servizio utilizza <b>solo cookie tecnici</b>; le
        categorie analitici e marketing sono predisposte e attivabili solo previo
        tuo consenso, sempre revocabile.
      </p>

      <h2>3. Base giuridica</h2>
      <p>
        I cookie tecnici sono necessari e non richiedono consenso. I cookie
        analitici e di marketing sono installati <b>solo previo tuo consenso</b>,
        prestato in modo granulare tramite il banner; il rifiuto è agevole quanto
        l&apos;accettazione e nessuna scelta è preimpostata.
      </p>

      <h2>4. Come gestire il consenso</h2>
      <p>
        Puoi modificare o revocare il consenso in qualsiasi momento tramite il
        pannello dedicato:
      </p>
      <p className="not-prose">
        <CookiePreferencesButton className="btn-ghost !px-4 !py-2 text-sm" />
      </p>
      <p>
        Puoi inoltre bloccare o eliminare i cookie dalle impostazioni del browser;
        disabilitando quelli tecnici alcune funzioni (es. il login) potrebbero non
        funzionare. Per il trattamento dei dati vedi la{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    </div>
  );
}
