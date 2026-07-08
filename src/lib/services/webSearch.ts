export interface WebResult {
  title: string;
  url: string;
  content: string;
  publishedDate: string | null;
}

export function webSearchAvailable(): boolean {
  return !!process.env.TAVILY_API_KEY;
}

/**
 * Ricerca web tramite Tavily (se configurato).
 * Ritorna [] se nessun provider di ricerca è configurato: i chiamanti
 * gestiscono il fallback.
 */
export async function searchWeb(
  query: string,
  opts: { maxResults?: number; topic?: "general" | "news"; days?: number } = {},
): Promise<WebResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: opts.maxResults ?? 6,
      topic: opts.topic ?? "general",
      days: opts.days,
      include_raw_content: true,
      search_depth: "advanced",
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily error ${res.status}`);
  }
  const data = (await res.json()) as {
    results?: {
      title: string;
      url: string;
      content: string;
      raw_content?: string;
      published_date?: string;
    }[];
  };

  return (data.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    content: (r.raw_content || r.content || "").slice(0, 6000),
    publishedDate: r.published_date ?? null,
  }));
}
