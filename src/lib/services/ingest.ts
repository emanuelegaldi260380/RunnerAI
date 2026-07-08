import { getVisionProvider, extractJSON } from "@/lib/llm";
import type { ImageInput } from "@/lib/llm/types";

export interface ExtractedActivity {
  type:
    | "easy"
    | "long"
    | "tempo"
    | "interval"
    | "race"
    | "recovery"
    | "other"
    | null;
  date: string | null; // ISO yyyy-mm-dd
  distanceKm: number | null;
  durationSec: number | null;
  avgPaceSecPerKm: number | null;
  avgHr: number | null;
  maxHr: number | null;
  elevationGainM: number | null;
  calories: number | null;
  cadence: number | null;
  splits: { km: number; paceSec: number; hr: number | null }[] | null;
  hrZones: { z1?: number; z2?: number; z3?: number; z4?: number; z5?: number } | null;
  confidence: number; // 0-1
  notes: string | null;
}

const SYSTEM = `Sei un assistente esperto nell'estrarre dati strutturati da screenshot di attività di corsa (Garmin Connect, Garmin watch, Strava e simili).
Analizza l'immagine e restituisci SOLO un oggetto JSON con questo schema:
{
  "type": "easy|long|tempo|interval|race|recovery|other|null",
  "date": "yyyy-mm-dd o null",
  "distanceKm": number|null,
  "durationSec": number|null,        // durata totale in secondi
  "avgPaceSecPerKm": number|null,    // passo medio in secondi per km (es. 5'30\"/km = 330)
  "avgHr": number|null,
  "maxHr": number|null,
  "elevationGainM": number|null,
  "calories": number|null,
  "cadence": number|null,            // passi/min medi
  "splits": [{"km": number, "paceSec": number, "hr": number|null}]|null,
  "hrZones": {"z1":sec,"z2":sec,"z3":sec,"z4":sec,"z5":sec}|null,
  "confidence": number,              // 0-1, quanto sei sicuro della lettura
  "notes": "eventuali note o dati non mappabili, o null"
}
Regole:
- Converti SEMPRE i passi in secondi/km e le durate in secondi.
- Se un campo non è visibile, usa null (non inventare).
- Deduci "type" dai dati (es. ripetute con passi alternati = interval, corsa lunga lenta = long).
- Rispondi con JSON puro, senza testo o markdown.`;

export async function extractActivityFromImages(
  images: ImageInput[],
): Promise<ExtractedActivity> {
  const provider = getVisionProvider();
  const text = await provider.vision({
    system: SYSTEM,
    prompt:
      "Estrai i dati dell'allenamento da questo/i screenshot e restituisci il JSON.",
    images,
    temperature: 0.1,
    maxTokens: 2000,
  });
  const data = extractJSON<ExtractedActivity>(text);
  // normalizzazione minima
  return {
    type: data.type ?? null,
    date: data.date ?? null,
    distanceKm: numOrNull(data.distanceKm),
    durationSec: numOrNull(data.durationSec),
    avgPaceSecPerKm: numOrNull(data.avgPaceSecPerKm),
    avgHr: numOrNull(data.avgHr),
    maxHr: numOrNull(data.maxHr),
    elevationGainM: numOrNull(data.elevationGainM),
    calories: numOrNull(data.calories),
    cadence: numOrNull(data.cadence),
    splits: data.splits ?? null,
    hrZones: data.hrZones ?? null,
    confidence: typeof data.confidence === "number" ? data.confidence : 0.5,
    notes: data.notes ?? null,
  };
}

function numOrNull(v: unknown): number | null {
  if (typeof v === "number" && !isNaN(v)) return v;
  return null;
}
