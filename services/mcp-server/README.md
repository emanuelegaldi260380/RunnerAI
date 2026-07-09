# RunnerAI — MCP server personale

Server [MCP](https://modelcontextprotocol.io) (trasporto **stdio**) che espone il
tuo contesto di allenamento RunnerAI a un client AI locale (es. Claude Desktop).

## Strumenti

**Personali** (richiedono `RUNNERAI_TOKEN`, legato al tuo account):

- `my_profile` — profilo atleta + gemello fisiologico (soglia, zone FC,
  decoupling, durabilità, sensibilità al caldo) + mappatura sensazioni↔performance.
- `my_recent_activities` — ultimi allenamenti svolti (data, tipo, distanza, passo, FC).
- `my_training_plan` — piano attivo con le prossime sedute pianificate.

**Globali** (richiedono `SERVICE_TOKEN`):

- `latest_press` — rassegna stampa del running mondiale.
- `search_science` — ricerca nella base scientifica.

## Configurazione

1. In RunnerAI apri **Integrazioni → Token di accesso personali**, crea un token
   e copialo (è mostrato una sola volta).
2. Variabili d'ambiente:

   | Variabile        | Obbligatoria | Descrizione                                         |
   | ---------------- | ------------ | --------------------------------------------------- |
   | `RUNNERAI_URL`   | no           | Base URL di RunnerAI (default `http://localhost:3000`) |
   | `RUNNERAI_TOKEN` | per `my_*`   | Token personale (`rai_...`) creato in Integrazioni  |
   | `SERVICE_TOKEN`  | per globali  | Token di servizio di RunnerAI                       |

3. Avvio: `npm install && npm start`.

## Esempio (Claude Desktop `claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "runnerai": {
      "command": "npx",
      "args": ["tsx", "/percorso/assoluto/services/mcp-server/src/index.ts"],
      "env": {
        "RUNNERAI_URL": "https://tuo-dominio.example",
        "RUNNERAI_TOKEN": "rai_xxxxxxxxxxxx"
      }
    }
  }
}
```

Il token viaggia come `Authorization: Bearer rai_...` verso `/api/mcp/*`; nel DB
RunnerAI vive solo il suo hash SHA-256. Revocabile in qualsiasi momento dalla
pagina Integrazioni.
