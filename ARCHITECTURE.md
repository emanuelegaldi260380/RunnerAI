# RunnerAI — Architettura target (separazione agenti + MCP)

## 1. Principi

- **Layering stretto**: la logica di dominio non dipende dal framework web.
- **Agenti come servizi separati**: gli agenti LLM (ricerca scientifica, rassegna
  stampa, generazione piano, sync Garmin) girano fuori dal ciclo di richiesta web,
  in worker deployabili e scalabili in modo indipendente.
- **MCP come layer di interoperabilità**, non come bus interno: espone le capacità
  di RunnerAI a client/agenti AI in modo standard, e permette agli agenti di
  consumare tool esterni in modo uniforme.
- **Contratti espliciti** tra i layer (HTTP/JSON + token di servizio, evolvibile a coda).

## 2. Topologia dei servizi

```
                         ┌──────────────────────────────┐
   Browser  ────────────▶│  Web/App (Next.js)           │
                         │  - UI, auth, billing (Stripe) │
                         │  - API pubbliche/utente        │
                         │  - Domain services (core)      │
                         └───────┬───────────────┬────────┘
                                 │ HTTP+token     │ Prisma
                                 ▼                ▼
                   ┌───────────────────┐   ┌──────────────┐
                   │ Agent Worker(s)   │   │ Postgres     │
                   │ - research agent  │   │ (+ pgvector) │
                   │ - press agent     │   └──────────────┘
                   │ - plan engine     │
                   │ - garmin sync     │
                   │ scheduler/queue   │
                   └─────────┬─────────┘
                             │ consuma/espone tool
                             ▼
                   ┌───────────────────┐
                   │ MCP server        │◀── client AI esterni (Claude, IDE, agenti)
                   │ - tool RunnerAI    │
                   │ - tool integraz.   │
                   └───────────────────┘
```

## 3. Layer (dal basso)

1. **Data** — Prisma + Postgres (pgvector per il RAG). Nessuna logica.
2. **Domain / Application** — `services/*` puri (planEngine, scienceAgent,
   pressAgent, integrations). Nessun import di Next. È il "core" condiviso tra
   web e worker (in monorepo: package `@runnerai/core`).
3. **LLM layer** — provider astratti (Claude/OpenAI/DeepSeek) + retry + tracking token.
4. **Integration adapters** — Garmin/Strava, web-search; opzionalmente esposti come tool MCP.
5. **Delivery**:
   - **Web/App** (Next.js): presentazione + API + auth + billing.
   - **Agent Worker**: esecuzione schedulata/asincrona degli agenti.
   - **MCP server**: interoperabilità con client AI.

## 4. Ruolo di MCP (chiarimento)

MCP **non sostituisce** REST/coda tra web-app e servizi. Serve a:
- **Esporre RunnerAI** come set di tool (`get_athlete_profile`, `list_activities`,
  `generate_plan`, `search_science`, `latest_press`) consumabili da client AI con auth.
- **Dare tool agli agenti**: il plan-engine può consumare MCP server esterni
  (base-scientifica, garmin, web-search) in modo uniforme.

Il prototipo in `services/mcp-server/` espone i tool chiamando le API interne di
RunnerAI (`/api/service/*`) con un `SERVICE_TOKEN`: così l'MCP server è
**deployabile a parte** e disaccoppiato dal dominio.

## 5. Sicurezza dei confini

- **SERVICE_TOKEN**: bearer token per le chiamate servizio→servizio (`/api/service/*`).
- **CRON_SECRET**: per i trigger schedulati.
- Nessun servizio esterno accede al DB direttamente in produzione: passa dalle API
  del core (single source of truth per validazione/permessi). (Il worker può
  condividere il package core in monorepo quando conviene per performance.)

## 6. Migrazione a fasi (evolutiva, non big-bang)

- **Fase 0 (oggi)**: monolite Next.js, agenti come API route + Vercel Cron. ✅
- **Fase 1**: estrarre il **core** in un package condiviso (monorepo pnpm/turbo).
  Il dominio smette di importare Next (già quasi così).
- **Fase 2**: **Agent Worker** separato che esegue gli agenti via **coda**
  (Inngest/Trigger.dev o BullMQ) o cron proprio, chiamando il core o le API servizio.
- **Fase 3**: **MCP server** in produzione per client AI esterni; integrazioni
  come tool MCP.
- **Fase 4**: scaling indipendente (worker in autoscaling, web stateless), osservabilità.

### Trigger per separare (decisione data-driven)
- job che superano i timeout serverless
- necessità di runtime/dipendenze diverse (es. ML in Python)
- scaling o isolamento costi degli agenti
- picchi di lavoro asincroni (import storici Garmin massivi)

## 7. Deploy

- **Web/App** → Vercel (o container).
- **Agent Worker** → container long-running (Fly.io/Render/Railway) o serverless-queue.
- **MCP server** → processo stdio locale per client desktop, o server remoto (SSE/HTTP)
  dietro auth per accesso condiviso.
- **DB** → Neon/Supabase (Postgres + pgvector).

## 8. Stato del prototipo in questo repo

- `services/mcp-server/` — MCP server RunnerAI (SDK ufficiale) che espone tool via
  le API servizio.
- `services/agent-worker/` — worker standalone (node-cron) che esegue gli agenti
  schedulati chiamando le API di RunnerAI (disaccoppiato).
- `src/app/api/service/*` — API interne protette da `SERVICE_TOKEN` consumate dai
  servizi esterni.

> Il passaggio del *codice* degli agenti dentro al worker (anziché triggerarli via
> HTTP) è la Fase 2: richiede l'estrazione del core in un package monorepo ed è
> documentato qui come step successivo per non introdurre un big-bang rischioso ora.
