# RunnerAI 🏃‍♂️

SaaS che genera, corregge e ottimizza piani di corsa personalizzati usando **tre LLM** (Claude + ChatGPT come proponenti, DeepSeek come supervisore), alimentati dai dati reali degli allenamenti dell'utente e da una knowledge base scientifica aggiornata da un agente in background. Include rassegna stampa quotidiana sul running mondiale e abbonamento con prova gratuita di 14 giorni.

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind CSS v4**
- **Prisma 7** + **Postgres** (Neon, driver adapter `@prisma/adapter-pg`) — stesso DB in sviluppo e produzione; `pgvector` opzionale per il RAG nativo
- **Auth.js / NextAuth v5** (credenziali email/password, sessioni JWT)
- **Stripe** (abbonamento mensile, trial 14 giorni, webhook)
- SDK LLM: **@anthropic-ai/sdk** (Claude, vision), **openai** (ChatGPT + DeepSeek via baseURL)

## Setup

```bash
# 1. Installa le dipendenze
npm install

# 2. Configura le variabili d'ambiente
cp .env.example .env
#   - AUTH_SECRET: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
#   - ANTHROPIC_API_KEY / OPENAI_API_KEY / DEEPSEEK_API_KEY (opzionali: senza, gira in modalità demo)
#   - TAVILY_API_KEY (opzionale: web search per agente scientifico e rassegna stampa)
#   - STRIPE_* (opzionali: billing)

# 3. Crea il database
npx prisma migrate dev

# 4. Avvia
npm run dev
```

Apri http://localhost:3000. **L'app funziona anche senza API key** (piani demo rule-based + KB seed di principi consolidati): configura le key per attivare il motore a 3 LLM, il RAG e la ricerca web reali.

## Architettura

| Modulo | File | Descrizione |
|---|---|---|
| **Auth** | `src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts` | Registrazione/login, sessioni, protezione rotte |
| **Billing** | `src/lib/stripe.ts`, `src/app/api/billing/*`, `src/app/api/webhooks/stripe` | Checkout, trial, portale, webhook |
| **Layer LLM** | `src/lib/llm/*` | Provider intercambiabili (Claude/OpenAI/DeepSeek) + embeddings |
| **Ingest** | `src/lib/services/ingest.ts`, `src/app/api/activities/ingest` | Screenshot Garmin → estrazione dati via LLM vision |
| **Motore piano** | `src/lib/services/planEngine.ts` | 2 LLM propongono + 1 supervisiona → piano finale |
| **Knowledge base** | `src/lib/services/scienceAgent.ts`, `knowledge.ts` | Agente background: ricerca web → sintesi → RAG |
| **Rassegna stampa** | `src/lib/services/pressAgent.ts` | Job giornaliero: news running → sintesi |

### Ruoli LLM (configurabili via env)

`PLAN_PROPOSER_A=claude`, `PLAN_PROPOSER_B=openai`, `PLAN_SUPERVISOR=deepseek`. Il selettore è robusto: se un provider non è configurato, riassegna automaticamente i ruoli tra quelli disponibili.

### Job schedulati

`vercel.json` esegue ogni giorno:
- `/api/cron/research` (03:00) — aggiorna la base scientifica
- `/api/cron/press` (06:00) — aggiorna la rassegna stampa

Protetti da `CRON_SECRET` (header `Authorization: Bearer ...`) o da sessione utente per trigger manuale dalla dashboard.

## Da locale a produzione

1. **Database**: cambia `datasource` in `prisma/schema.prisma` a `postgresql`, sostituisci l'adapter in `src/lib/db.ts` con `@prisma/adapter-pg`, ed esegui le migrazioni. Per il RAG vero, aggiungi `pgvector` e sposta gli embedding da JSON string a colonna `vector`.
2. **Storage screenshot**: `src/app/api/activities/ingest` salva in `./uploads` → passa a S3/Cloudflare R2.
3. **Deploy**: Vercel (app) + Neon/Supabase (Postgres). Imposta tutte le env, configura il webhook Stripe e `CRON_SECRET`.

## Roadmap (non ancora implementato)

- Integrazione automatica **Garmin Connect** (ora: solo upload screenshot)
- Collegamento allenamento realizzato ↔ workout pianificato + auto-ricalibrazione del piano
- OAuth (Google), verifica email, reset password
- Vector search nativo (pgvector) al posto della similarità in-app
