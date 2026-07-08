import { db } from "@/lib/db";
import {
  cosineSimilarity,
  embed,
  embeddingsAvailable,
  parseEmbedding,
} from "@/lib/llm/embeddings";

export interface KnowledgeSnippet {
  id: string;
  title: string;
  sourceType: string;
  url: string;
  summary: string | null;
  keyPoints: unknown;
  imageUrl: string | null;
  translations: unknown;
  score: number;
}

/**
 * Recupera le fonti scientifiche più rilevanti per una query.
 * Usa gli embeddings se disponibili (cosine similarity in-app), altrimenti
 * ripiega sulle fonti con qualità/recency maggiore.
 */
export async function retrieveRelevant(
  query: string,
  k = 6,
): Promise<KnowledgeSnippet[]> {
  const sources = await db.scientificSource.findMany({
    orderBy: { qualityScore: "desc" },
    take: 200,
  });
  if (sources.length === 0) return [];

  if (embeddingsAvailable()) {
    try {
      const qv = await embed(query);
      const scored = sources
        .map((s) => {
          const v = parseEmbedding(s.embedding);
          const score = v ? cosineSimilarity(qv, v) : 0;
          return { s, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
      return scored.map(({ s, score }) => ({
        id: s.id,
        title: s.title,
        sourceType: s.sourceType,
        url: s.url,
        summary: s.summary,
        keyPoints: s.keyPoints,
        imageUrl: s.imageUrl,
        translations: s.translations,
        score,
      }));
    } catch {
      // fallback sotto
    }
  }

  return sources.slice(0, k).map((s) => ({
    id: s.id,
    title: s.title,
    sourceType: s.sourceType,
    url: s.url,
    summary: s.summary,
    keyPoints: s.keyPoints,
    imageUrl: s.imageUrl,
    translations: s.translations,
    score: s.qualityScore ?? 0,
  }));
}

/** Formatta gli snippet in un blocco di contesto per i prompt LLM */
export function formatKnowledgeContext(snippets: KnowledgeSnippet[]): string {
  if (snippets.length === 0) {
    return "(Nessuna fonte scientifica in knowledge base. Usa le migliori pratiche note e consolidate della scienza dell'allenamento.)";
  }
  return snippets
    .map((s, i) => {
      const kp = s.keyPoints
        ? `\n  Punti chiave: ${JSON.stringify(s.keyPoints)}`
        : "";
      return `[${i + 1}] ${s.title} (${s.sourceType})\n  ${s.summary ?? ""}${kp}\n  Fonte: ${s.url}`;
    })
    .join("\n\n");
}
