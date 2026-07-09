import {
  configuredProviders,
  getProvider,
  type LLMProvider,
  type ProviderName,
} from "@/lib/llm";

// ---------------------------------------------------------------------------
// Modulo 6 — Secondo Parere avversariale.
// Un coach AI INDIPENDENTE (diverso, quando possibile, da chi ha redatto il
// piano) esamina criticamente il piano finale in cerca di rischi: progressione
// del carico, sicurezza, aderenza a obiettivo e storico, realismo dei ritmi.
// Il risultato è persistito come PlanProposal role="CRITIC" (audit/trasparenza).
// ---------------------------------------------------------------------------

const LANG_NAME: Record<string, string> = {
  it: "italiano",
  en: "inglese",
  es: "spagnolo",
};

export interface PlanCritique {
  verdict: string; // giudizio sintetico
  soundnessScore: number | null; // 0-100 solidità complessiva
  risks: string[]; // rischi rilevati (ordinati per gravità)
  strengths: string[]; // punti di forza
  adjustments: string[]; // aggiustamenti consigliati
}

/**
 * Sceglie un provider per il secondo parere, preferendone uno DIVERSO da quello
 * che ha prodotto il piano (indipendenza del giudizio). Null se nessuno.
 */
export function pickCriticProvider(exclude?: ProviderName): LLMProvider | null {
  const configured = configuredProviders();
  if (configured.length === 0) return null;
  const independent = configured.find((p) => p !== exclude);
  return getProvider(independent ?? configured[0]);
}

/** Esegue il secondo parere avversariale sul piano. Null in caso di errore. */
export async function critiquePlan(
  provider: LLMProvider,
  brief: string,
  knowledge: string,
  plan: unknown,
  lang = "it",
): Promise<PlanCritique | null> {
  const langName = LANG_NAME[lang] ?? lang;
  const sys =
    "Sei un coach di corsa d'élite incaricato di un SECONDO PARERE indipendente e critico su un piano di allenamento già redatto da altri. " +
    "Il tuo compito NON è riscrivere il piano ma trovarne i punti deboli: sovraccarico o progressione troppo rapida (regola del ~10%), " +
    "rischio infortuni, monotonia, ritmi irrealistici rispetto allo storico, scarsa aderenza all'obiettivo, recuperi insufficienti. " +
    "Sii onesto e specifico. Rispondi SOLO con JSON valido.";
  const user =
    `Contesto atleta:\n${brief}\n\n` +
    `Fonti scientifiche:\n${knowledge}\n\n` +
    `PIANO DA ESAMINARE:\n${JSON.stringify(plan)}\n\n` +
    `Esamina criticamente il piano. Scrivi TUTTI i testi in ${langName}. Rispondi con JSON:\n` +
    `{ "verdict": "1-2 frasi di giudizio complessivo", ` +
    `"soundnessScore": numero 0-100 (solidità del piano), ` +
    `"risks": ["rischi concreti ordinati per gravità, max 5"], ` +
    `"strengths": ["punti di forza, max 3"], ` +
    `"adjustments": ["aggiustamenti consigliati e attuabili, max 5"] }`;

  try {
    const out = await provider.chatJSON<PlanCritique>({
      system: sys,
      messages: [{ role: "user", content: user }],
      maxTokens: 900,
    });
    const clean = (arr: unknown, max: number): string[] =>
      Array.isArray(arr)
        ? arr.map((x) => String(x).slice(0, 240)).filter(Boolean).slice(0, max)
        : [];
    const verdict = String(out?.verdict ?? "").slice(0, 400);
    if (!verdict && !Array.isArray(out?.risks)) return null;
    return {
      verdict,
      soundnessScore:
        typeof out?.soundnessScore === "number"
          ? Math.max(0, Math.min(100, Math.round(out.soundnessScore)))
          : null,
      risks: clean(out?.risks, 5),
      strengths: clean(out?.strengths, 3),
      adjustments: clean(out?.adjustments, 5),
    };
  } catch {
    return null;
  }
}
