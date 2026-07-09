import { promises as fs } from "fs";
import path from "path";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { storageConfigured, putObject } from "@/lib/storage";

const IMG_DIR = path.join(process.cwd(), "public", "science-images");

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

/**
 * Ritorna l'immagine di una fonte scientifica: usa l'og:image se presente,
 * altrimenti ne genera una concettuale e la mette in cache (imageUrl condiviso).
 */
export async function getOrCreateScienceImage(
  id: string,
  force = false,
): Promise<string | null> {
  const src = await db.scientificSource.findUnique({ where: { id } });
  if (!src) return null;
  if (!force && src.imageUrl) return src.imageUrl;
  if (!process.env.OPENAI_API_KEY) return null;

  const topics = Array.isArray(src.topics) ? (src.topics as string[]).join(", ") : "";
  const key = slugify(src.title) || src.id.slice(0, 10);

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.images.generate({
      model: "gpt-image-1",
      prompt: `Illustrazione concettuale editoriale, minimalista e pulita, sul tema dell'allenamento della corsa: "${src.title}"${topics ? ` (argomenti: ${topics})` : ""}. Stile piatto, colori sobri, nessun testo, nessun grafico con numeri.`,
      size: "1024x1024",
      quality: "low",
      n: 1,
    });
    const item = res.data?.[0];
    let buffer: Buffer | null = null;
    if (item?.b64_json) buffer = Buffer.from(item.b64_json, "base64");
    else if (item?.url) {
      const dl = await fetch(item.url);
      if (dl.ok) buffer = Buffer.from(await dl.arrayBuffer());
    }
    if (!buffer) return null;

    const fileName = `${key}-${src.id.slice(-6)}.png`;
    let imageUrl: string;
    if (storageConfigured()) {
      imageUrl = await putObject(`science-images/${fileName}`, buffer, "image/png");
    } else {
      await fs.mkdir(IMG_DIR, { recursive: true });
      await fs.writeFile(path.join(IMG_DIR, fileName), buffer);
      imageUrl = `/science-images/${fileName}`;
    }

    await db.scientificSource.update({ where: { id }, data: { imageUrl } });
    return imageUrl;
  } catch (e) {
    logger.warn("Generazione immagine fonte scientifica fallita", e);
    return null;
  }
}
