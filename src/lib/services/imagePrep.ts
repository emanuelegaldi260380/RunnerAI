import sharp from "sharp";
import { logger } from "@/lib/logger";

// L'API vision di Anthropic rifiuta immagini con un lato > 8000px. Gli
// screenshot Garmin "lunghi" (splits, grafici) superano facilmente questa
// soglia in altezza. Ridimensioniamo il lato più lungo entro un margine di
// sicurezza mantenendo le proporzioni (solo rimpicciolimento, mai ingrandimento).
export const MAX_VISION_EDGE = 7800;

/**
 * Restituisce un buffer immagine con entrambi i lati <= MAX_VISION_EDGE.
 * Le immagini già entro i limiti tornano invariate (stesso buffer). Il formato
 * di output coincide con quello di input, quindi il media type resta valido.
 */
export async function normalizeForVision(buf: Buffer): Promise<Buffer> {
  try {
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w <= MAX_VISION_EDGE && h <= MAX_VISION_EDGE) return buf;
    return await sharp(buf)
      .resize(MAX_VISION_EDGE, MAX_VISION_EDGE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer();
  } catch (e) {
    // Immagine illeggibile da sharp: prosegui col buffer originale (il magic
    // byte era già validato). Nel peggiore dei casi la vision restituirà l'errore.
    logger.warn("Ridimensionamento screenshot per vision fallito", e);
    return buf;
  }
}
