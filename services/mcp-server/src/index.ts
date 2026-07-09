/**
 * RunnerAI MCP server (deployabile a parte).
 * Espone le capacità di RunnerAI come tool MCP, chiamando le API di servizio
 * (`/api/service/*`) con SERVICE_TOKEN. Trasporto stdio (client desktop / agenti).
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BASE = process.env.RUNNERAI_URL || "http://localhost:3000";
const TOKEN = process.env.SERVICE_TOKEN || "";
// Token PERSONALE dell'utente (generato in RunnerAI → Integrazioni). Lega il
// server MCP a un solo account: gli strumenti "my_*" leggono i suoi dati.
const USER_TOKEN = process.env.RUNNERAI_TOKEN || "";

/** Chiamata alle API di servizio globali (rassegna stampa, scienza). */
async function api(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`RunnerAI API ${res.status} su ${path}`);
  return res.json();
}

/** Chiamata alle API personali (/api/mcp/*) col token dell'utente. */
async function apiPersonal(path: string): Promise<unknown> {
  if (!USER_TOKEN) {
    throw new Error(
      "RUNNERAI_TOKEN non configurato: crea un token in RunnerAI → Integrazioni.",
    );
  }
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${USER_TOKEN}` },
  });
  if (!res.ok) throw new Error(`RunnerAI API ${res.status} su ${path}`);
  return res.json();
}

const TOOLS = [
  {
    name: "latest_press",
    description:
      "Ultimi articoli della rassegna stampa del running mondiale (titolo, fonte, sintesi).",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "numero di articoli (default 10)" },
      },
    },
  },
  {
    name: "search_science",
    description:
      "Cerca nella base scientifica dell'allenamento della corsa per rilevanza.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "argomento da cercare" },
        k: { type: "number", description: "numero di fonti (default 6)" },
      },
      required: ["query"],
    },
  },
  {
    name: "my_profile",
    description:
      "Contesto dell'atleta collegato: profilo, gemello fisiologico (soglia, zone, decoupling, durabilità, sensibilità al caldo) e mappatura sensazioni↔performance. Richiede RUNNERAI_TOKEN.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "my_recent_activities",
    description:
      "Ultimi allenamenti svolti dall'atleta collegato (data, tipo, distanza, passo, FC). Richiede RUNNERAI_TOKEN.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "numero di attività (default 15, max 50)" },
      },
    },
  },
  {
    name: "my_training_plan",
    description:
      "Piano di allenamento attivo dell'atleta collegato con le prossime sedute pianificate. Richiede RUNNERAI_TOKEN.",
    inputSchema: { type: "object", properties: {} },
  },
] as const;

const server = new Server(
  { name: "runnerai", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    if (name === "latest_press") {
      const limit = Number((args as { limit?: number })?.limit ?? 10);
      const data = (await api(`/api/service/press?limit=${limit}`)) as {
        articles: unknown;
      };
      return { content: [{ type: "text", text: JSON.stringify(data.articles, null, 2) }] };
    }
    if (name === "search_science") {
      const a = args as { query?: string; k?: number };
      const q = encodeURIComponent(a?.query ?? "");
      const k = Number(a?.k ?? 6);
      const data = (await api(`/api/service/science?q=${q}&k=${k}`)) as {
        sources: unknown;
      };
      return { content: [{ type: "text", text: JSON.stringify(data.sources, null, 2) }] };
    }
    if (name === "my_profile") {
      const data = await apiPersonal(`/api/mcp/context`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
    if (name === "my_recent_activities") {
      const limit = Number((args as { limit?: number })?.limit ?? 15);
      const data = (await apiPersonal(`/api/mcp/activities?limit=${limit}`)) as {
        activities: unknown;
      };
      return { content: [{ type: "text", text: JSON.stringify(data.activities, null, 2) }] };
    }
    if (name === "my_training_plan") {
      const data = (await apiPersonal(`/api/mcp/plan`)) as { plan: unknown };
      return { content: [{ type: "text", text: JSON.stringify(data.plan, null, 2) }] };
    }
    return {
      content: [{ type: "text", text: `Tool sconosciuto: ${name}` }],
      isError: true,
    };
  } catch (e) {
    return {
      content: [{ type: "text", text: `Errore: ${e instanceof Error ? e.message : e}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
// stderr per non sporcare il protocollo su stdout
console.error("RunnerAI MCP server avviato (stdio).");
