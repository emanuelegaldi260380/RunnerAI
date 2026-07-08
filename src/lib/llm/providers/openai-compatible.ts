import OpenAI from "openai";
import {
  ChatOptions,
  extractJSON,
  LLMProvider,
  ProviderName,
  VisionOptions,
} from "../types";
import { recordUsage } from "@/lib/usage";
import { withRetry } from "../retry";

interface OpenAICompatibleConfig {
  name: ProviderName;
  apiKey: string;
  baseURL?: string;
  model: string;
  supportsVision: boolean;
  /** alcune API (DeepSeek) supportano response_format json_object */
  supportsJsonMode?: boolean;
}

/**
 * Provider generico per API compatibili OpenAI.
 * Usato sia per OpenAI (ChatGPT, con vision) sia per DeepSeek (baseURL custom).
 */
export class OpenAICompatibleProvider implements LLMProvider {
  readonly name: ProviderName;
  readonly model: string;
  readonly supportsVision: boolean;
  private client: OpenAI;
  private supportsJsonMode: boolean;

  constructor(cfg: OpenAICompatibleConfig) {
    this.name = cfg.name;
    this.model = cfg.model;
    this.supportsVision = cfg.supportsVision;
    this.supportsJsonMode = cfg.supportsJsonMode ?? true;
    this.client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
  }

  private toMessages(opts: ChatOptions): OpenAI.Chat.ChatCompletionMessageParam[] {
    const msgs: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (opts.system) msgs.push({ role: "system", content: opts.system });
    for (const m of opts.messages) {
      msgs.push({ role: m.role, content: m.content });
    }
    return msgs;
  }

  async chat(opts: ChatOptions): Promise<string> {
    const res = await withRetry(() =>
      this.client.chat.completions.create({
        model: this.model,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 4096,
        messages: this.toMessages(opts),
      }),
    );
    await this.record(res, "chat");
    return res.choices[0]?.message?.content ?? "";
  }

  private async record(
    res: { usage?: { prompt_tokens?: number; completion_tokens?: number } | null },
    operation: "chat" | "vision",
  ) {
    await recordUsage({
      provider: this.name,
      model: this.model,
      operation,
      promptTokens: res.usage?.prompt_tokens,
      completionTokens: res.usage?.completion_tokens,
    });
  }

  async chatJSON<T = unknown>(opts: ChatOptions): Promise<T> {
    const system =
      (opts.system ? opts.system + "\n\n" : "") +
      "Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo aggiuntivo o markdown.";
    const res = await withRetry(() =>
      this.client.chat.completions.create({
        model: this.model,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 4096,
        messages: this.toMessages({ ...opts, system }),
        ...(this.supportsJsonMode
          ? { response_format: { type: "json_object" as const } }
          : {}),
      }),
    );
    await this.record(res, "chat");
    const text = res.choices[0]?.message?.content ?? "";
    return extractJSON<T>(text);
  }

  async vision(opts: VisionOptions): Promise<string> {
    if (!this.supportsVision) {
      throw new Error(`Il provider ${this.name} non supporta l'analisi immagini`);
    }
    const res = await withRetry(() =>
      this.client.chat.completions.create({
      model: this.model,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 4096,
      messages: [
        ...(opts.system
          ? [{ role: "system" as const, content: opts.system }]
          : []),
        {
          role: "user",
          content: [
            { type: "text" as const, text: opts.prompt },
            ...opts.images.map((img) => ({
              type: "image_url" as const,
              image_url: {
                url: `data:${img.mediaType};base64,${img.base64}`,
              },
            })),
          ],
        },
      ],
      }),
    );
    await this.record(res, "vision");
    return res.choices[0]?.message?.content ?? "";
  }
}
