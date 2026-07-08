import Anthropic from "@anthropic-ai/sdk";
import {
  ChatOptions,
  extractJSON,
  LLMProvider,
  VisionOptions,
} from "../types";
import { recordUsage } from "@/lib/usage";
import { withRetry } from "../retry";

/**
 * Provider Claude (Anthropic). Forte su vision (screenshot Garmin) e
 * ragionamento/supervisione dei piani.
 */
export class AnthropicProvider implements LLMProvider {
  readonly name = "claude" as const;
  readonly model: string;
  readonly visionModel: string;
  readonly supportsVision = true;
  private client: Anthropic;

  constructor(cfg?: { apiKey?: string; model?: string }) {
    const apiKey = cfg?.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY mancante");
    this.client = new Anthropic({ apiKey });
    this.model = cfg?.model ?? process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
    this.visionModel = cfg?.model ?? process.env.ANTHROPIC_VISION_MODEL ?? this.model;
  }

  async chat(opts: ChatOptions): Promise<string> {
    const res = await withRetry(() =>
      this.client.messages.create({
        model: this.model,
        max_tokens: opts.maxTokens ?? 4096,
        // nota: alcuni modelli recenti (es. Opus 4.8) hanno deprecato `temperature`
        system: opts.system,
        messages: opts.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
      }),
    );
    await recordUsage({
      provider: this.name,
      model: this.model,
      operation: "chat",
      promptTokens: res.usage?.input_tokens,
      completionTokens: res.usage?.output_tokens,
    });
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  }

  async chatJSON<T = unknown>(opts: ChatOptions): Promise<T> {
    const system =
      (opts.system ? opts.system + "\n\n" : "") +
      "Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo aggiuntivo o markdown.";
    const text = await this.chat({ ...opts, system, temperature: opts.temperature ?? 0.4 });
    return extractJSON<T>(text);
  }

  async vision(opts: VisionOptions): Promise<string> {
    const res = await withRetry(() =>
      this.client.messages.create({
        model: this.visionModel,
        max_tokens: opts.maxTokens ?? 4096,
        system: opts.system,
        messages: [
          {
            role: "user",
            content: [
              ...opts.images.map((img) => ({
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: img.mediaType,
                  data: img.base64,
                },
              })),
              { type: "text" as const, text: opts.prompt },
            ],
          },
        ],
      }),
    );
    await recordUsage({
      provider: this.name,
      model: this.visionModel,
      operation: "vision",
      promptTokens: res.usage?.input_tokens,
      completionTokens: res.usage?.output_tokens,
    });
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  }
}
