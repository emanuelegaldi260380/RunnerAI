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

async function api(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
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
