// Interfaccia comune per tutti i provider LLM

export type ProviderName = "claude" | "openai" | "deepseek";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatOptions {
  system?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ImageInput {
  base64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp";
}

export interface VisionOptions {
  system?: string;
  prompt: string;
  images: ImageInput[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  readonly name: ProviderName;
  readonly model: string;
  /** Se il provider supporta input immagine */
  readonly supportsVision: boolean;
  /** Chat testuale, ritorna il testo della risposta */
  chat(opts: ChatOptions): Promise<string>;
  /** Chat che forza/estrae un oggetto JSON tipizzato */
  chatJSON<T = unknown>(opts: ChatOptions): Promise<T>;
  /** Analisi immagini (screenshot). Throw se non supportata */
  vision(opts: VisionOptions): Promise<string>;
}

/** Estrae il primo blocco JSON valido da una risposta LLM (robusto ai ```json fences) */
export function extractJSON<T = unknown>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // fallback: primo { ... } o [ ... ] bilanciato
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error("Nessun JSON valido trovato nella risposta LLM:\n" + text.slice(0, 500));
  }
}
