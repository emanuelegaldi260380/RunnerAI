import { db } from "@/lib/db";
import {
  configuredProviders,
  getProvider,
  type ProviderName,
} from "@/lib/llm";
import { embed, embeddingsAvailable, serializeEmbedding } from "@/lib/llm/embeddings";
import { searchWeb, webSearchAvailable } from "./webSearch";
import { fetchOgImage } from "./ogImage";

/** Query di default che l'agente esplora per costruire la base scientifica */
export const DEFAULT_RESEARCH_QUERIES = [
  "endurance running training periodization science",
  "polarized training 80/20 distance runners evidence",
  "VO2max interval training protocols running research",
  "lactate threshold tempo training methods running",
  "marathon training long run physiological adaptations",
  "running injury prevention load management research",
  "tapering strategies before race performance study",
  "strength training for distance runners economy",
];

function pickSummarizer(): ProviderName | null {
  const order: ProviderName[] = ["deepseek", "openai", "claude"];
  const configured = configuredProviders();
  return order.find((p) => configured.includes(p)) ?? configured[0] ?? null;
}

interface ExtractedKnowledge {
  summary: string;
  keyPoints: string[];
  topics: string[];
  sourceType: "paper" | "article" | "method" | "guideline" | "book";
  qualityScore: number; // 0-1
}

const EXTRACT_SYSTEM = `Sei un ricercatore esperto di scienza dell'allenamento nella corsa.
Data una fonte web, estrai la conoscenza utile ad allenare i runner.
Rispondi SOLO con JSON:
{
  "summary": "sintesi in italiano (3-6 frasi) dei contenuti rilevanti per l'allenamento",
  "keyPoints": ["insight applicabile 1", "insight 2", ...],
  "topics": ["tag1", "tag2"],
  "sourceType": "paper|article|method|guideline|book",
  "qualityScore": number
}
qualityScore (0-1): affidabilità e rilevanza scientifica (paper peer-reviewed alto, blog generico basso).`;

async function extractKnowledge(
  provider: ProviderName,
  title: string,
  url: string,
  content: string,
): Promise<ExtractedKnowledge> {
  const p = getProvider(provider);
  return p.chatJSON<ExtractedKnowledge>({
    system: EXTRACT_SYSTEM,
    messages: [
      {
        role: "user",
        content: `TITOLO: ${title}\nURL: ${url}\n\nCONTENUTO:\n${content.slice(0, 6000)}`,
      },
    ],
    temperature: 0.2,
    maxTokens: 1200,
  });
}

export interface ResearchResult {
  found: number;
  saved: number;
  usedWebSearch: boolean;
}

/** Esegue un ciclo di ricerca scientifica e alimenta la KB */
export async function runResearch(
  queries: string[] = DEFAULT_RESEARCH_QUERIES,
): Promise<ResearchResult> {
  const run = await db.researchRun.create({
    data: { query: queries.join(" | "), status: "running" },
  });

  const summarizer = pickSummarizer();
  let found = 0;
  let saved = 0;
  const usedWebSearch = webSearchAvailable();

  if (usedWebSearch && summarizer) {
    for (const q of queries) {
      let results;
      try {
        results = await searchWeb(q, { maxResults: 5 });
      } catch {
        continue;
      }
      found += results.length;
      for (const r of results) {
        const exists = await db.scientificSource.findUnique({
          where: { url: r.url },
        });
        if (exists) continue;
        try {
          const k = await extractKnowledge(summarizer, r.title, r.url, r.content);
          let embedding: string | null = null;
          if (embeddingsAvailable()) {
            try {
              embedding = serializeEmbedding(
                await embed(`${r.title}\n${k.summary}\n${k.keyPoints.join("\n")}`),
              );
            } catch {
              /* embeddings opzionali */
            }
          }
          const imageUrl = await fetchOgImage(r.url);
          await db.scientificSource.create({
            data: {
              url: r.url,
              title: r.title,
              sourceType: k.sourceType ?? "article",
              summary: k.summary,
              keyPoints: k.keyPoints,
              topics: k.topics,
              content: r.content.slice(0, 4000),
              imageUrl,
              embedding,
              qualityScore: k.qualityScore ?? 0.5,
              publishedAt: r.publishedDate ? new Date(r.publishedDate) : null,
            },
          });
          saved++;
        } catch {
          continue;
        }
      }
    }
  } else {
    // Nessuna web search / LLM: assicura che la KB abbia i principi fondamentali
    saved += await seedKnowledgeBase();
  }

  await db.researchRun.update({
    where: { id: run.id },
    data: {
      status: "completed",
      foundCount: found,
      savedCount: saved,
      finishedAt: new Date(),
    },
  });

  return { found, saved, usedWebSearch };
}

/**
 * Semina la KB con principi consolidati della scienza dell'allenamento.
 * Usato in assenza di web search per non lasciare la KB vuota.
 */
export async function seedKnowledgeBase(): Promise<number> {
  const seeds: {
    url: string;
    title: string;
    sourceType: string;
    summary: string;
    keyPoints: string[];
    topics: string[];
    qualityScore: number;
  }[] = [
    {
      url: "seed://polarized-training",
      title: "Allenamento polarizzato (80/20)",
      sourceType: "method",
      summary:
        "L'evidenza su atleti di endurance suggerisce che ~80% del volume dovrebbe essere a bassa intensità (Z1-Z2) e ~20% ad alta intensità (Z4-Z5), minimizzando l'intensità intermedia. Migliora adattamenti aerobici riducendo il rischio di sovraccarico.",
      keyPoints: [
        "80% del volume in bassa intensità conversazionale",
        "20% in lavori intensi (soglia alta, VO2max)",
        "Evitare la 'zona grigia' cronica a media intensità",
      ],
      topics: ["intensità", "distribuzione", "aerobico"],
      qualityScore: 0.9,
    },
    {
      url: "seed://progressive-overload",
      title: "Sovraccarico progressivo e regola del 10%",
      sourceType: "guideline",
      summary:
        "Il volume settimanale va incrementato gradualmente (spesso citato ~10%/settimana come prudenza) con settimane di scarico ogni 3-4 settimane per consolidare gli adattamenti e ridurre il rischio di infortunio.",
      keyPoints: [
        "Incrementi graduali del carico settimanale",
        "Settimana di scarico ogni 3-4 settimane",
        "Progressione di durata prima dell'intensità",
      ],
      topics: ["carico", "progressione", "infortuni"],
      qualityScore: 0.85,
    },
    {
      url: "seed://long-run",
      title: "Il lungo lento e gli adattamenti aerobici",
      sourceType: "method",
      summary:
        "La corsa lunga a intensità aerobica sviluppa densità mitocondriale, capillarizzazione, uso dei grassi ed efficienza. Per maratona può arrivare al 25-30% del volume settimanale, con progressione graduale della durata.",
      keyPoints: [
        "Migliora resistenza e utilizzo dei grassi",
        "Progredire in durata, non in intensità",
        "Chiave per gare lunghe (mezza/maratona)",
      ],
      topics: ["lungo", "aerobico", "maratona"],
      qualityScore: 0.85,
    },
    {
      url: "seed://vo2max-intervals",
      title: "Intervalli VO2max",
      sourceType: "method",
      summary:
        "Ripetute a intensità vicino al VO2max (es. 3-5 minuti, recuperi incompleti) migliorano la potenza aerobica massima. Volume tipico 4-8 minuti fino a ~20-30 min di lavoro effettivo per i più allenati.",
      keyPoints: [
        "Ripetute di 3-5 min vicino al massimo aerobico",
        "Recuperi incompleti per accumulare tempo ad alta intensità",
        "Aumentano il tetto della potenza aerobica",
      ],
      topics: ["vo2max", "ripetute", "intensità"],
      qualityScore: 0.85,
    },
    {
      url: "seed://tapering",
      title: "Tapering pre-gara",
      sourceType: "guideline",
      summary:
        "Ridurre il volume del 40-60% nelle 1-3 settimane pre-gara mantenendo un po' di intensità migliora la performance riducendo la fatica e preservando la forma. La riduzione è soprattutto sul volume, non sull'intensità.",
      keyPoints: [
        "Ridurre il volume, mantenere l'intensità",
        "Durata 1-3 settimane secondo la gara",
        "Riduce fatica preservando gli adattamenti",
      ],
      topics: ["tapering", "gara", "recupero"],
      qualityScore: 0.85,
    },
  ];

  let saved = 0;
  for (const s of seeds) {
    const exists = await db.scientificSource.findUnique({ where: { url: s.url } });
    if (exists) continue;
    let embedding: string | null = null;
    if (embeddingsAvailable()) {
      try {
        embedding = serializeEmbedding(
          await embed(`${s.title}\n${s.summary}\n${s.keyPoints.join("\n")}`),
        );
      } catch {
        /* opzionale */
      }
    }
    await db.scientificSource.create({
      data: {
        url: s.url,
        title: s.title,
        sourceType: s.sourceType,
        summary: s.summary,
        keyPoints: s.keyPoints,
        topics: s.topics,
        embedding,
        qualityScore: s.qualityScore,
      },
    });
    saved++;
  }
  return saved;
}
