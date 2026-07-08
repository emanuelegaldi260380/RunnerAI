import OpenAI from "openai";
import { recordUsage } from "@/lib/usage";
import { withRetry } from "./retry";

/**
 * Embeddings per la knowledge base scientifica (RAG).
 * In locale/skeleton salviamo il vettore come JSON string; in produzione
 * si passa a Postgres + pgvector.
 */

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export function embeddingsAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export async function embed(text: string): Promise<number[]> {
  const c = getClient();
  if (!c) throw new Error("OPENAI_API_KEY mancante: embeddings non disponibili");
  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  const res = await withRetry(() =>
    c.embeddings.create({ model, input: text.slice(0, 8000) }),
  );
  await recordUsage({
    provider: "openai",
    model,
    operation: "embedding",
    promptTokens: res.usage?.prompt_tokens,
  });
  return res.data[0].embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function serializeEmbedding(v: number[]): string {
  return JSON.stringify(v);
}

export function parseEmbedding(s: string | null): number[] | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as number[];
  } catch {
    return null;
  }
}
