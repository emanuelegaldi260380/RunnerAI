# RunnerAI — Servizi separati (agenti + MCP)

Prototipo della separazione descritta in [`../ARCHITECTURE.md`](../ARCHITECTURE.md).
Entrambi i servizi sono **deployabili a parte** e parlano con RunnerAI via HTTP:

- il **worker** usa `CRON_SECRET` sulle route `/api/cron/*`
- l'**MCP server** usa `SERVICE_TOKEN` sulle route `/api/service/*`

Nessuno dei due importa il dominio della web-app: il disaccoppiamento è reale.

## Agent Worker (`agent-worker/`)

Esegue gli agenti schedulati (ricerca scientifica, rassegna stampa, sync Garmin)
fuori dal ciclo di richiesta web.

```bash
cd services/agent-worker
npm install
RUNNERAI_URL=http://localhost:3000 CRON_SECRET=<secret> npm start   # scheduler
RUNNERAI_URL=http://localhost:3000 CRON_SECRET=<secret> npm run once # una tantum
```

Deploy: container long-running (Fly.io/Render/Railway) o adattare a una coda
(Inngest/Trigger.dev/BullMQ) per la Fase 2.

## MCP server (`mcp-server/`)

Espone le capacità di RunnerAI come tool MCP a client AI (Claude Desktop, IDE, agenti).

```bash
cd services/mcp-server
npm install
RUNNERAI_URL=http://localhost:3000 SERVICE_TOKEN=<token> npm start   # stdio
```

Tool esposti: `latest_press`, `search_science` (estendibili: profilo atleta,
generazione piano, ecc. aggiungendo route `/api/service/*`).

Esempio config client MCP (stdio):
```json
{
  "mcpServers": {
    "runnerai": {
      "command": "tsx",
      "args": ["/percorso/RunnerAI/services/mcp-server/src/index.ts"],
      "env": { "RUNNERAI_URL": "http://localhost:3000", "SERVICE_TOKEN": "<token>" }
    }
  }
}
```

## Prossimo passo (Fase 2)

Estrarre il core (`src/lib/services`, `src/lib/llm`) in un package monorepo
condiviso (`@runnerai/core`) così il worker esegue la **logica** degli agenti in
locale invece di triggerarla via HTTP. Vedi ARCHITECTURE.md §6.
