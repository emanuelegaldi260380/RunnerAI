// ---------------------------------------------------------------------------
// Dati identificativi del fornitore (D.Lgs. 70/2003, art. 7) + config legale.
//
// ⚠️ COMPILARE con i dati REALI prima della pubblicazione. Questo è l'UNICO
// punto da modificare: footer, documenti legali e info precontrattuali leggono
// da qui.
// ---------------------------------------------------------------------------

export const COMPANY = {
  /** Nome commerciale del servizio */
  brand: "RunnerAI",
  /** Ragione sociale completa (es. "Mario Rossi" per ditta individuale, o "RunnerAI S.r.l.") */
  legalName: "[RAGIONE SOCIALE]",
  /** Forma giuridica (es. "Società a responsabilità limitata", "Ditta individuale") */
  legalForm: "[FORMA GIURIDICA]",
  /** Partita IVA */
  vat: "[00000000000]",
  /** Codice Fiscale (se diverso dalla P.IVA) */
  taxCode: "[CODICE FISCALE]",
  /** Numero di iscrizione al Registro delle Imprese / REA */
  rea: "[REA XX-000000]",
  /** Capitale sociale (solo per società di capitali), es. "10.000,00 € i.v." */
  shareCapital: "[CAPITALE SOCIALE]",
  address: {
    street: "[Via e numero civico]",
    zip: "[CAP]",
    city: "[Città]",
    province: "[PR]",
    country: "Italia",
  },
  /** PEC (obbligatoria per le imprese) */
  pec: "[pec@pec.example]",
  email: {
    support: "info@runnerai.example",
    privacy: "privacy@runnerai.example",
    legal: "legal@runnerai.example",
  },
  /** Titolare del trattamento (di norma coincide con la ragione sociale) */
  dataController: "[RAGIONE SOCIALE]",
} as const;

/** Indirizzo su una riga per footer/imprint. */
export function companyAddressLine(): string {
  const a = COMPANY.address;
  return `${a.street}, ${a.zip} ${a.city} (${a.province}), ${a.country}`;
}

// ---------------------------------------------------------------------------
// Versioni dei documenti legali. Incrementare la data quando cambia il testo:
// serve a tracciare QUALE versione l'utente ha accettato (accountability GDPR
// e art. 1341-1342 c.c.). Formato: YYYY-MM-DD.
// ---------------------------------------------------------------------------
export const LEGAL_VERSIONS = {
  terms: "2026-07-07",
  privacy: "2026-07-07",
  cookie: "2026-07-07",
} as const;

/** Dicitura "Ultimo aggiornamento" leggibile. */
export const LEGAL_LAST_UPDATED = "7 luglio 2026";
