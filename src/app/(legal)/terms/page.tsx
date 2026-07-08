import { COMPANY, LEGAL_LAST_UPDATED } from "@/lib/legal/company";

export const metadata = { title: "Termini e Condizioni — RunnerAI" };

export default function TermsPage() {
  return (
    <div className="prose-legal">
      <h1>Condizioni Generali di Contratto</h1>
      <p className="text-sm text-muted">Ultimo aggiornamento: {LEGAL_LAST_UPDATED}</p>
      <p className="rounded-lg bg-brand/5 p-3 text-sm">
        ⚠️ Modello da far revisionare a un legale prima della produzione. Non
        costituisce consulenza legale.
      </p>

      <h2>1. Fornitore e oggetto</h2>
      <p>
        Il servizio {COMPANY.brand} è fornito da <b>{COMPANY.legalName}</b>
        {COMPANY.legalForm ? ` (${COMPANY.legalForm})` : ""}, P.IVA {COMPANY.vat}
        {" "}(i dati completi sono nella pagina <a href="/contatti">Contatti</a>).
        {COMPANY.brand} genera, corregge e ottimizza piani di allenamento per la
        corsa assistiti da intelligenza artificiale, a partire dai dati forniti
        dall&apos;utente.
      </p>

      <h2>2. Avviso su salute e rischi</h2>
      <p>
        I piani sono suggerimenti automatici e <b>non costituiscono consulenza
        medica</b>. Consulta un medico prima di iniziare un programma di
        allenamento. Usi il servizio a tuo rischio.
      </p>

      <h2>3. Account</h2>
      <p>
        Sei responsabile della sicurezza del tuo account e della veridicità dei
        dati forniti. Il servizio è riservato a maggiorenni.
      </p>

      <h2>4. Informazioni precontrattuali, prezzi e durata (art. 48 Cod. Consumo)</h2>
      <p>
        Prima di ogni acquisto ti vengono mostrate, in modo chiaro, le
        caratteristiche essenziali del servizio, il <b>prezzo totale IVA
        inclusa</b>, la durata del contratto (abbonamento a rinnovo mensile), le
        modalità di pagamento e le condizioni di recesso. È disponibile una prova
        gratuita di 14 giorni. I piani a pagamento e i relativi prezzi correnti
        sono indicati nella pagina <a href="/billing">Abbonamento</a>; i pagamenti
        sono gestiti da Stripe.
      </p>

      <h2>5. Rinnovo automatico e preavviso (art. 65-bis Cod. Consumo)</h2>
      <p>
        L&apos;abbonamento si rinnova automaticamente alla scadenza per un periodo
        pari a quello iniziale, salvo disdetta. Ti invieremo un <b>preavviso
        scritto almeno 30 giorni prima</b> della data di rinnovo, tramite email
        (strumento tracciabile), ricordandoti la scadenza e le modalità di
        disdetta. In mancanza di tale preavviso, potrai recedere senza spese e
        avrai diritto al rimborso degli importi non goduti.
      </p>

      <h2>6. Diritto di recesso (14 giorni) e sua rinuncia per i contenuti digitali</h2>
      <p>
        In quanto consumatore hai diritto di recedere dal contratto entro
        <b> 14 giorni</b> senza motivazione (artt. 52 ss. Cod. Consumo),
        scrivendo a {COMPANY.email.support} o usando la funzione di disdetta
        online.
      </p>
      <p>
        Trattandosi di un <b>servizio digitale</b> ad esecuzione immediata, se
        chiedi espressamente l&apos;attivazione durante il periodo di recesso e
        <b> dichiari di rinunciare</b> al diritto di recesso (accettazione
        specifica in fase di acquisto), <b>perdi il diritto di recesso</b> una
        volta iniziata l&apos;erogazione (art. 59, c. 1, lett. o). Se non presti
        tale dichiarazione, conservi il recesso 14 giorni anche dopo aver iniziato
        a usare il servizio.
      </p>

      <h2>7. Disdetta online semplice (art. 54-bis Cod. Consumo)</h2>
      <p>
        Puoi disdire l&apos;abbonamento <b>online, in modo diretto e immediato</b>,
        con la stessa facilità con cui ti sei iscritto, dalla pagina{" "}
        <a href="/billing">Abbonamento</a> (funzione &quot;Disdici
        abbonamento&quot;). La disdetta ha effetto alla fine del periodo già
        pagato; non è previsto alcun onere o passaggio aggiuntivo.
      </p>

      <h2>8. Uso accettabile</h2>
      <p>
        Non è consentito abusare del servizio, aggirare i limiti di utilizzo,
        effettuare reverse engineering o violare i termini delle integrazioni di
        terze parti (es. Garmin, Strava).
      </p>

      <h2>9. Integrazioni di terze parti</h2>
      <p>
        L&apos;integrazione con Garmin può avvenire con un metodo non ufficiale
        tramite le tue credenziali: la loro fornitura è volontaria e la
        funzionalità può interrompersi se il fornitore cambia i propri sistemi.
      </p>

      <h2>10. Limitazione di responsabilità</h2>
      <p>
        Il servizio è fornito &quot;così com&apos;è&quot;. Nei limiti consentiti
        dalla legge, il Fornitore non è responsabile per danni indiretti, perdita
        di dati o per infortuni derivanti dal seguire i piani. Nulla in queste
        condizioni limita i diritti inderogabili del consumatore.
      </p>

      <h2>11. Modifiche alle condizioni</h2>
      <p>
        Eventuali modifiche saranno comunicate con ragionevole preavviso; per le
        modifiche sostanziali potrai recedere senza spese.
      </p>

      <h2>12. Legge applicabile e foro</h2>
      <p>
        Il contratto è regolato dalla legge italiana. Per il consumatore è
        competente in via esclusiva il foro del luogo di sua residenza o domicilio
        (art. 66-bis Cod. Consumo).
      </p>

      <hr className="my-8 border-border" />

      {/* Clausole vessatorie: elenco e approvazione specifica ex art. 1341-1342 c.c. */}
      <h2 id="vessatorie">
        13. Approvazione specifica delle clausole vessatorie (artt. 1341-1342 c.c.)
      </h2>
      <p>
        Ai sensi e per gli effetti degli artt. 1341 e 1342 del Codice Civile,
        l&apos;utente, spuntando l&apos;apposita casella <b>separata</b> in fase di
        registrazione/acquisto, dichiara di aver letto e di <b>approvare
        specificamente</b> le seguenti clausole:
      </p>
      <ul>
        <li><b>Art. 5</b> — Rinnovo automatico dell&apos;abbonamento;</li>
        <li>
          <b>Art. 6</b> — Rinuncia al diritto di recesso per i contenuti/servizi
          digitali ad esecuzione immediata;
        </li>
        <li><b>Art. 8</b> — Limitazioni all&apos;uso del servizio;</li>
        <li>
          <b>Art. 9</b> — Integrazioni di terze parti tramite credenziali e
          possibile interruzione della funzionalità;
        </li>
        <li>
          <b>Art. 10</b> — Limitazione di responsabilità e fornitura del servizio
          &quot;così com&apos;è&quot;;
        </li>
        <li><b>Art. 11</b> — Facoltà di modifica delle condizioni.</li>
      </ul>
      <p className="text-sm text-muted">
        Nota: le clausole abusive ai sensi degli artt. 33 ss. del Codice del
        Consumo restano comunque inefficaci a prescindere dall&apos;approvazione.
      </p>
    </div>
  );
}
