import { configuredProviders, getProvider, type ProviderName } from "@/lib/llm";
import type { Lang } from "@/lib/i18n";

const LANG_NAME: Record<Lang, string> = {
  it: "italiano",
  en: "inglese",
  es: "spagnolo",
};

function pickTranslator(): ProviderName | null {
  const order: ProviderName[] = ["deepseek", "openai", "claude"];
  const configured = configuredProviders();
  return order.find((p) => configured.includes(p)) ?? configured[0] ?? null;
}

export function translationAvailable(): boolean {
  return pickTranslator() !== null;
}

/** Traduce un singolo testo (risposta in testo semplice: robusta anche su testi lunghi) */
export async function translateText(
  text: string,
  target: Lang,
): Promise<string> {
  if (!text || target === "it") return text;
  const provider = pickTranslator();
  if (!provider) return text;
  try {
    const p = getProvider(provider);
    const out = await p.chat({
      system: `Sei un traduttore professionale. Traduci il testo dell'utente in ${LANG_NAME[target]} mantenendo il significato e un tono giornalistico. Non tradurre i nomi propri. Rispondi SOLO con la traduzione, senza premesse né virgolette.`,
      messages: [{ role: "user", content: text }],
      temperature: 0.2,
      maxTokens: 2000,
    });
    return out.trim() || text;
  } catch {
    return text;
  }
}

/** Traduce più campi testuali (una chiamata per campo) */
export async function translateFields(
  fields: Record<string, string>,
  target: Lang,
): Promise<Record<string, string>> {
  if (target === "it") return fields;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = await translateText(v, target);
  }
  return out;
}
