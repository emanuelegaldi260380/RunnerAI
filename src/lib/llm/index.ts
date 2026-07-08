import { AnthropicProvider } from "./providers/anthropic";
import { OpenAICompatibleProvider } from "./providers/openai-compatible";
import { LLMProvider, ProviderName } from "./types";

export * from "./types";

const cache = new Map<ProviderName, LLMProvider>();

/** Ritorna true se il provider ha una API key configurata */
export function isProviderConfigured(name: ProviderName): boolean {
  switch (name) {
    case "claude":
      return !!process.env.ANTHROPIC_API_KEY;
    case "openai":
      return !!process.env.OPENAI_API_KEY;
    case "deepseek":
      return !!process.env.DEEPSEEK_API_KEY;
  }
}

export function configuredProviders(): ProviderName[] {
  return (["claude", "openai", "deepseek"] as ProviderName[]).filter(
    isProviderConfigured,
  );
}

/** Istanzia (lazy, cached) un provider per nome */
export function getProvider(name: ProviderName): LLMProvider {
  const cached = cache.get(name);
  if (cached) return cached;

  let provider: LLMProvider;
  switch (name) {
    case "claude":
      provider = new AnthropicProvider();
      break;
    case "openai":
      provider = new OpenAICompatibleProvider({
        name: "openai",
        apiKey: requireKey("OPENAI_API_KEY"),
        model: process.env.OPENAI_MODEL || "gpt-4o",
        supportsVision: true,
      });
      break;
    case "deepseek":
      provider = new OpenAICompatibleProvider({
        name: "deepseek",
        apiKey: requireKey("DEEPSEEK_API_KEY"),
        baseURL: "https://api.deepseek.com",
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        supportsVision: false,
      });
      break;
    default:
      throw new Error(`Provider LLM sconosciuto: ${name}`);
  }
  cache.set(name, provider);
  return provider;
}

/** Costruisce un provider con chiave e modello personalizzati (BYOK) */
export function buildUserProvider(
  provider: ProviderName,
  apiKey: string,
  model: string,
): LLMProvider {
  switch (provider) {
    case "claude":
      return new AnthropicProvider({ apiKey, model });
    case "openai":
      return new OpenAICompatibleProvider({
        name: "openai",
        apiKey,
        model,
        supportsVision: true,
      });
    case "deepseek":
      return new OpenAICompatibleProvider({
        name: "deepseek",
        apiKey,
        baseURL: "https://api.deepseek.com",
        model,
        supportsVision: false,
      });
  }
}

function requireKey(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} mancante`);
  return v;
}

/** Ruoli del motore piano (2 proponenti + 1 supervisore) da env */
export interface PlanRoles {
  proposerA: ProviderName;
  proposerB: ProviderName;
  supervisor: ProviderName;
}

export function getPlanRoles(): PlanRoles {
  return {
    proposerA: (process.env.PLAN_PROPOSER_A as ProviderName) || "claude",
    proposerB: (process.env.PLAN_PROPOSER_B as ProviderName) || "openai",
    supervisor: (process.env.PLAN_SUPERVISOR as ProviderName) || "deepseek",
  };
}

/** Il miglior provider disponibile capace di vision (per screenshot) */
export function getVisionProvider(): LLMProvider {
  const preference: ProviderName[] = ["claude", "openai"];
  for (const name of preference) {
    if (isProviderConfigured(name)) return getProvider(name);
  }
  throw new Error(
    "Nessun provider vision configurato (serve ANTHROPIC_API_KEY o OPENAI_API_KEY)",
  );
}
