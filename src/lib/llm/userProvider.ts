import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import {
  buildUserProvider,
  getProvider,
  isProviderConfigured,
  type LLMProvider,
  type ProviderName,
} from "@/lib/llm";

/**
 * Ritorna il provider testuale da usare per un utente:
 * la sua chiave BYOK se attiva e valida, altrimenti il miglior provider
 * di default configurato su RunnerAI. Null se nessuno è disponibile.
 */
export async function getUserTextProvider(
  userId: string,
): Promise<LLMProvider | null> {
  const userLlm = await db.userLlmConfig.findUnique({ where: { userId } });
  if (userLlm?.enabled && userLlm.apiKeyEnc) {
    try {
      const key = decrypt(userLlm.apiKeyEnc);
      return buildUserProvider(
        userLlm.provider as ProviderName,
        key,
        userLlm.model,
      );
    } catch {
      // chiave utente non valida -> fallback alle chiavi RunnerAI
    }
  }
  const preference: ProviderName[] = ["claude", "openai", "deepseek"];
  for (const name of preference) {
    if (isProviderConfigured(name)) return getProvider(name);
  }
  return null;
}
