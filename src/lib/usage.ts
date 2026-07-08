import { db } from "@/lib/db";
import { currentUserId } from "@/lib/requestContext";

/**
 * Registra il consumo di token di una chiamata LLM.
 * Fire-and-forget: non deve mai far fallire la chiamata LLM.
 */
export async function recordUsage(o: {
  provider: string;
  model: string;
  operation: "chat" | "vision" | "embedding";
  promptTokens?: number;
  completionTokens?: number;
}): Promise<void> {
  const promptTokens = Math.max(0, Math.round(o.promptTokens ?? 0));
  const completionTokens = Math.max(0, Math.round(o.completionTokens ?? 0));
  try {
    await db.tokenUsage.create({
      data: {
        provider: o.provider,
        model: o.model,
        operation: o.operation,
        userId: currentUserId() ?? null,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    });
  } catch {
    /* logging best-effort */
  }
}
