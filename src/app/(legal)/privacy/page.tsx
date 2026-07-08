import { COMPANY, companyAddressLine, LEGAL_LAST_UPDATED } from "@/lib/legal/company";

export const metadata = { title: "Privacy Policy — RunnerAI" };

export default function PrivacyPage() {
  return (
    <div className="prose-legal">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-muted">Ultimo aggiornamento: {LEGAL_LAST_UPDATED}</p>
      <p className="rounded-lg bg-brand/5 p-3 text-sm">
        Informativa ai sensi degli artt. 13-14 del Regolamento (UE) 2016/679
        (GDPR). ⚠️ Modello da far revisionare a un legale prima della produzione.
      </p>

      <div className="rounded-lg border border-brand/40 bg-brand/5 p-4 not-prose">
        <p className="font-semibold">🔒 Impegno sui tuoi dati</p>
        <p className="mt-1 text-sm">
          I tuoi dati personali e di allenamento <b>non vengono utilizzati per
          addestrare o alimentare alcun modello di intelligenza artificiale</b>, né
          <b> condivisi, direttamente o indirettamente, con altri utenti</b>. I
          dati inviati ai provider AI servono esclusivamente a generare il tuo
          piano, in modo isolato al tuo account, e i provider sono vincolati a non
          usarli per l&apos;addestramento dei loro modelli.
        </p>
      </div>

      <h2>1. Titolare del trattamento</h2>
      <p>
        Titolare del trattamento è <b>{COMPANY.dataController}</b>, {companyAddressLine()}.
        Per ogni richiesta relativa ai dati personali: {COMPANY.email.privacy}
        {" "}(PEC: {COMPANY.pec}).
      </p>

      <h2>2. Categorie di dati trattati</h2>
      <ul>
        <li>Dati account: nome, email (o profilo Google in caso di login social).</li>
        <li>
          Dati relativi all&apos;attività fisica: profilo atleta, obiettivi, zone
          cardiache, frequenza cardiaca, allenamenti (da screenshot, Garmin o
          Strava). Alcuni possono qualificarsi come <b>dati relativi alla salute</b>
          {" "}(art. 9 GDPR), trattati solo con il tuo consenso esplicito e per
          fornirti il servizio.
        </li>
        <li>Credenziali/token delle integrazioni, <b>cifrati a riposo</b> (AES-256-GCM).</li>
        <li>Dati di pagamento gestiti da Stripe (non memorizziamo i dati della carta).</li>
        <li>Dati tecnici minimi di funzionamento (log, sessione, indirizzo IP).</li>
      </ul>

      <h2>3. Finalità e basi giuridiche</h2>
      <table>
        <thead>
          <tr>
            <th>Finalità</th>
            <th>Base giuridica (art. 6/9 GDPR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Erogazione del servizio (generazione/correzione piani)</td>
            <td>Esecuzione del contratto (art. 6.1.b)</td>
          </tr>
          <tr>
            <td>Trattamento dei dati sulla salute per personalizzare il piano</td>
            <td>Consenso esplicito (art. 9.2.a)</td>
          </tr>
          <tr>
            <td>Fatturazione, gestione abbonamento, adempimenti fiscali</td>
            <td>Obbligo legale / contratto (art. 6.1.c / 6.1.b)</td>
          </tr>
          <tr>
            <td>Sicurezza, prevenzione abusi, log tecnici</td>
            <td>Legittimo interesse (art. 6.1.f)</td>
          </tr>
          <tr>
            <td>Comunicazioni di servizio (es. preavviso rinnovo)</td>
            <td>Obbligo legale / contratto</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Responsabili esterni e destinatari</h2>
      <p>
        Ci avvaliamo di fornitori che trattano dati per nostro conto (responsabili
        ex art. 28 GDPR): <b>Anthropic, OpenAI, DeepSeek</b> (elaborazione AI dei
        soli dati necessari, senza addestramento dei modelli), <b>Stripe</b>
        {" "}(pagamenti), <b>Garmin / Strava</b> (integrazioni scelte da te),
        {" "}<b>Google</b> (login), <b>Resend</b> (invio email), oltre al provider
        di hosting e database. Ciascuno tratta i dati secondo contratti e proprie
        policy.
      </p>

      <h2>5. Trasferimenti extra-UE</h2>
      <p>
        Alcuni fornitori (es. provider AI e di pagamento) possono trattare dati
        fuori dallo Spazio Economico Europeo. In tal caso il trasferimento è
        garantito da adeguate garanzie (clausole contrattuali standard della
        Commissione UE o decisioni di adeguatezza).
      </p>

      <h2>6. Conservazione</h2>
      <p>
        Conserviamo i dati per il tempo necessario a erogare il servizio e finché
        l&apos;account è attivo. Dopo la cancellazione dell&apos;account, i dati
        sono eliminati o anonimizzati, salvo gli obblighi di conservazione di
        legge (es. fatturazione: 10 anni).
      </p>

      <h2>7. I tuoi diritti</h2>
      <p>
        Hai diritto di accesso, rettifica, cancellazione, limitazione,
        portabilità, opposizione e di revocare in ogni momento il consenso (senza
        pregiudicare i trattamenti già svolti). Puoi esercitarli scrivendo a
        {" "}{COMPANY.email.privacy}. Puoi inoltre proporre reclamo al
        {" "}<b>Garante per la protezione dei dati personali</b>
        {" "}(<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">garanteprivacy.it</a>).
      </p>
      <p>
        Esportazione e cancellazione self-service sono disponibili nelle
        impostazioni dell&apos;account.
      </p>

      <h2>8. Cookie</h2>
      <p>
        Per l&apos;uso dei cookie e la gestione del consenso vedi la{" "}
        <a href="/cookie">Cookie Policy</a>.
      </p>
    </div>
  );
}
