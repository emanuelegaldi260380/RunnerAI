# RunnerAI — Checklist go-live

Stato del **codice**: pronto per la produzione. Quello che resta richiede **tue
credenziali, dati reali o account esterni** — nessuno lo posso completare io.
Ogni voce indica se è **bloccante** (l'app non funziona senza) o **consigliata**.

---

## 1. Dati aziendali e legali — 🔴 BLOCCANTE (obblighi di legge B2C)

- [ ] **Compila `src/lib/legal/company.ts`** con i dati reali: ragione sociale,
      forma giuridica, P.IVA, C.F., REA, capitale sociale, indirizzo, **PEC**,
      email di contatto. Oggi contiene placeholder `[...]`. È l'unico file da
      toccare: footer, documenti legali e info precontrattuali leggono da qui.
- [ ] **Revisione legale** dei testi in `src/app/(legal)/*` (Termini con clausole
      vessatorie art. 1341-1342, Privacy GDPR, Cookie) da parte di un avvocato.
- [ ] Verifica che i **prezzi mostrati siano IVA inclusa** (`tier.*.price` in
      `src/lib/i18n.ts`) e coerenti con i prezzi Stripe.

## 2. Database Postgres — 🔴 BLOCCANTE

- [x] Schema migrato a Postgres/Neon; migrazioni in `prisma/migrations/` allineate
      (incl. `physiology_profile`).
- [x] Migrazione `20260709120000_autopsy_and_api_tokens` (tabelle `PerformanceAutopsy`
      e `ApiToken` per i Moduli 1 e 5) **applicata a Neon** (2026-07-09). Autopsia e
      Token personali/MCP ora operativi.
- [ ] In produzione imposta `DATABASE_URL` sul DB di **produzione** (può essere lo
      stesso branch Neon o uno separato) ed esegui `prisma migrate deploy` in fase
      di release (NON `db push`, NON `migrate dev`).

## 3. Storage oggetti (immagini + screenshot) — 🔴 BLOCCANTE su serverless

Su hosting serverless `public/` è read-only ed effimero: senza storage esterno le
immagini generate (esercizi, base scientifica) e gli screenshot **non persistono**.
Il codice ora supporta uno storage **S3-compatibile** con fallback al filesystem
locale in sviluppo (firma SigV4 nativa, verificata contro il vettore AWS —
`src/lib/storage.test.ts`).

- [ ] Crea un bucket su **Cloudflare R2** (consigliato, egress gratuito) o S3/B2.
- [ ] Imposta gli env `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
      `S3_SECRET_ACCESS_KEY`, `S3_REGION` (`auto` per R2) e `S3_PUBLIC_BASE_URL`
      (dominio pubblico/r2.dev del bucket). Vedi `.env.example`.
- [ ] Rendi **pubblici in lettura** gli oggetti (le immagini sono `<img src>`
      diretti). Gli screenshot restano privati per l'utente: se vuoi mostrarli in
      app servirà una URL firmata (non necessario oggi, non sono ri-serviti).

## 4. Stripe (pagamenti) — 🔴 BLOCCANTE per incassare

Codice pronto: checkout precontrattuale (art. 48/59), webhook con **verifica
firma + idempotenza + guardia ordine + rollback su errore**, disdetta online,
preavviso rinnovo. Serve solo la configurazione live.

- [ ] Account Stripe in modalità **live**. Crea 2 prodotti/prezzi (Base, Pro).
- [ ] Env: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
      `STRIPE_PRICE_ID` (base), `STRIPE_PRICE_ID_PRO`.
- [ ] Crea l'endpoint **webhook** su `/api/webhooks/stripe` e metti il segreto in
      `STRIPE_WEBHOOK_SECRET`. Eventi minimi: `checkout.session.completed`,
      `customer.subscription.*`, `invoice.payment_failed`.
- [ ] Testa un pagamento reale end-to-end (upgrade, rinnovo, disdetta).

## 5. Email transazionali — 🟠 CONSIGLIATO (reset password, preavvisi)

- [ ] Account **Resend** (o SMTP): `RESEND_API_KEY`, `EMAIL_FROM` con dominio
      verificato (SPF/DKIM). Senza, reset password e preavviso rinnovo non partono.

## 6. Auth e social login — 🔴/🟠

- [ ] `AUTH_SECRET` (32 byte random), `AUTH_URL`/`APP_URL` = dominio di produzione.
- [ ] `ENCRYPTION_KEY` (32 byte base64) per cifrare token integrazioni/BYOK — 🔴
      se usi Garmin/Strava/BYOK.
- [ ] Google OAuth (`GOOGLE_CLIENT_ID/SECRET`) con redirect URI di produzione — 🟠.
- [ ] `ADMIN_EMAILS` con le tue email admin.

## 7. Integrazioni allenamenti — 🟠 CONSIGLIATO

- [ ] **Strava**: `STRAVA_CLIENT_ID/SECRET` + redirect URI di produzione.
- [ ] **Garmin (deep-sync ricco)**: deploya il bridge in `services/garmin-bridge/`
      su una **VPS con IP stabile** (Docker), imposta `GARMIN_BRIDGE_URL` (HTTPS
      obbligatorio) e lo stesso `SERVICE_TOKEN`. È beta friends&family (login non
      ufficiale); il primo accesso può richiedere una run supervisionata se c'è MFA.

## 8. Rate limit distribuito — 🟠 CONSIGLIATO su serverless

- [ ] Il rate-limit in-memory non è efficace tra più istanze/lambda. Imposta
      **Upstash Redis** (`UPSTASH_REDIS_REST_URL/TOKEN`) per un limite reale.

## 9. Servizi/cron e segreti — 🔴

- [ ] `SERVICE_TOKEN` e `CRON_SECRET` con valori casuali (i placeholder di sviluppo
      fanno **fallire il boot in produzione**, vedi `src/lib/env.ts`).
- [ ] Configura i cron (rassegna stampa, ricerca KB, sync Garmin, preavviso
      rinnovo) sul tuo scheduler/host (vedi `vercel.json` o equivalente).

## 10. Osservabilità — 🟢 opzionale

- [ ] `ERROR_WEBHOOK_URL` per notifiche errori; `TAVILY_API_KEY`/`BRAVE_API_KEY`
      per la ricerca web dell'agente KB.

---

### Riepilogo: cosa è già pronto nel codice
- Multi-LLM (Claude+OpenAI propongono, DeepSeek supervisiona) + **BYOK** (piani
  illimitati per utenti Pro con chiave propria).
- **Gemello fisiologico** (Mod.2: LT2, zone reali, decoupling, durabilità, curva
  caldo) che calibra i piani; ricalcolato a ogni deep-sync.
- **Autopsia post-performance** (Mod.1): analisi tecnica di gare/sedute chiave
  (positive split, cedimento, drift cardiaco, regolarità) + lettura AI e lezioni.
- **Mappatura soggettivo↔oggettivo** (Mod.4): correlazioni personali sensazioni↔
  performance dai log, iniettate anche nel prompt del piano.
- **Secondo parere avversariale** (Mod.6): un coach AI indipendente critica il
  piano generato (rischi, aggiustamenti); mostrato nella pagina Piano.
- **Server MCP personale** (Mod.5): token API personali (hash SHA-256) + endpoint
  `/api/mcp/*`; il server in `services/mcp-server` espone profilo/attività/piano.
- Giudizio di merito AI su ogni allenamento importato.
- i18n completa it/en/es (area utente + pubblica).
- Sicurezza: header + CSP di produzione, cifratura token, validazione MIME upload,
  idempotenza Stripe, rate-limit (in-memory → Upstash in prod).
- Storage S3-compatibile con firma SigV4 verificata.
- Test: `npm test` (39 test, verdi).
