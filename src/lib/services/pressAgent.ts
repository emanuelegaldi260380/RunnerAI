import { db } from "@/lib/db";
import { configuredProviders, getProvider, type ProviderName } from "@/lib/llm";
import { searchWeb, webSearchAvailable } from "./webSearch";
import { translateFields } from "./translate";
import { fetchOgImage } from "./ogImage";

const PRESS_QUERIES = [
  "elite marathon race results this week",
  "distance running track and field results diamond league",
  "trail running ultramarathon results",
  "road running 10k half marathon world records news",
];

function pickSummarizer(): ProviderName | null {
  const order: ProviderName[] = ["deepseek", "openai", "claude"];
  const configured = configuredProviders();
  return order.find((p) => configured.includes(p)) ?? configured[0] ?? null;
}

interface PressExtract {
  relevant: boolean;
  summary: string;
  category: "elite" | "marathon" | "track" | "trail" | "science" | "gear" | "other";
}

const PRESS_SYSTEM = `Sei un giornalista sportivo esperto di CORSA (atletica leggera, strada, pista, trail, maratona).
Data una notizia, determina prima se è davvero attinente al mondo della corsa/running. Escludi tutto ciò che NON riguarda la corsa (es. esposizioni canine, altri sport, gossip, pubblicità).
Poi, se attinente, scrivi una sintesi giornalistica concisa in italiano (2-3 frasi) e assegna una categoria.
Rispondi SOLO con JSON: {"relevant": true|false, "summary": "...", "category": "elite|marathon|track|trail|science|gear|other"}`;

/** Normalizza un titolo per dedup per evento (rimuove la testata dopo " - " / " | ") */
function eventKey(title: string): string {
  return title
    .replace(/\s[-|–—]\s[^-|–—]*$/, "") // rimuove " - Testata" finale
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 8)
    .join(" ");
}

export interface PressResult {
  found: number;
  saved: number;
  skipped: number;
  usedWebSearch: boolean;
}

export async function runPressReview(): Promise<PressResult> {
  const summarizer = pickSummarizer();
  let found = 0;
  let saved = 0;
  let skipped = 0;
  const usedWebSearch = webSearchAvailable();

  if (!usedWebSearch || !summarizer) {
    saved += await seedPress();
    return { found: 0, saved, skipped: 0, usedWebSearch };
  }

  // rimuovi eventuali voci demo quando arrivano notizie reali
  await db.pressArticle.deleteMany({ where: { url: { startsWith: "seed://" } } });

  // chiavi-evento già presenti negli ultimi 4 giorni (dedup cross-run)
  const recent = await db.pressArticle.findMany({
    where: { fetchedAt: { gte: new Date(Date.now() - 4 * 86400000) } },
    select: { title: true },
  });
  const seenKeys = new Set(recent.map((r) => eventKey(r.title)));

  for (const q of PRESS_QUERIES) {
    let results;
    try {
      results = await searchWeb(q, { topic: "news", days: 4, maxResults: 6 });
    } catch {
      continue;
    }
    found += results.length;
    for (const r of results) {
      const key = eventKey(r.title);
      if (seenKeys.has(key)) {
        skipped++;
        continue;
      }
      const exists = await db.pressArticle.findUnique({ where: { url: r.url } });
      if (exists) {
        skipped++;
        continue;
      }
      try {
        const p = getProvider(summarizer);
        const ex = await p.chatJSON<PressExtract>({
          system: PRESS_SYSTEM,
          messages: [
            {
              role: "user",
              content: `TITOLO: ${r.title}\nURL: ${r.url}\n\n${r.content.slice(0, 3000)}`,
            },
          ],
          temperature: 0.3,
          maxTokens: 400,
        });
        if (!ex.relevant) {
          skipped++;
          continue;
        }
        const imageUrl = await fetchOgImage(r.url);
        // traduci titolo + sintesi (anteprima) nelle lingue supportate
        const translations: Record<string, { title?: string; summary?: string }> = {};
        for (const lang of ["en", "es"] as const) {
          const tr = await translateFields({ title: r.title, summary: ex.summary }, lang);
          translations[lang] = { title: tr.title, summary: tr.summary };
        }
        await db.pressArticle.create({
          data: {
            url: r.url,
            title: r.title,
            source: hostOf(r.url),
            category: ex.category ?? "other",
            summary: ex.summary,
            content: cleanExcerpt(r.content),
            translations,
            imageUrl,
            publishedAt: r.publishedDate ? new Date(r.publishedDate) : new Date(),
          },
        });
        seenKeys.add(key);
        saved++;
      } catch {
        skipped++;
        continue;
      }
    }
  }

  return { found, saved, skipped, usedWebSearch };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

/** Estratto pulito per il reader in-app (~1500 caratteri) */
function cleanExcerpt(raw: string): string {
  return raw
    .replace(/\[[^\]]*\]\([^)]*\)/g, "") // link markdown [testo](url)
    .replace(/https?:\/\/\S+/g, "") // url nudi
    .replace(/[#*_>`|]+/g, " ") // simboli markdown
    .replace(/(?:\b\d+\.\s*){2,}/g, " ") // sequenze "1. 2. 3."
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);
}


async function seedPress(): Promise<number> {
  const s = {
    url: "seed://press-demo-1",
    title: "Modalità demo: configura la ricerca web per la rassegna reale",
    source: "runnerai",
    category: "other",
    summary:
      "Voce di esempio. Imposta TAVILY_API_KEY per attivare la rassegna stampa giornaliera automatica con notizie e risultati reali del running mondiale.",
  };
  const exists = await db.pressArticle.findUnique({ where: { url: s.url } });
  if (exists) return 0;
  await db.pressArticle.create({ data: { ...s, publishedAt: new Date() } });
  return 1;
}
