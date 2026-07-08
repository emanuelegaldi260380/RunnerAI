import { promises as fs } from "fs";
import path from "path";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const IMG_DIR = path.join(process.cwd(), "public", "exercise-images");

const RUNNING_TERMS = [
  "corsa", "corri", "run", "jog", "strides", "allunghi", "ripetute",
  "sprint", "fartlek", "tempo run", "lungo", "recupero corsa",
];

export interface SeqStep {
  path: string;
  caption: string;
}

const PHASES = [
  { key: "1", caption: "Posizione di partenza", hint: "posizione iniziale, preparazione" },
  { key: "2", caption: "Esecuzione", hint: "fase centrale del movimento, massima attivazione muscolare" },
  { key: "3", caption: "Ritorno", hint: "posizione finale / ritorno controllato" },
];

export function isRunningExercise(name: string): boolean {
  const n = name.toLowerCase();
  return RUNNING_TERMS.some((t) => n.includes(t));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function generateAndSave(prompt: string, fileName: string): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.images.generate({
    model: "gpt-image-1",
    prompt,
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
  await fs.mkdir(IMG_DIR, { recursive: true });
  await fs.writeFile(path.join(IMG_DIR, fileName), buffer);
  return `/exercise-images/${fileName}`;
}

const STYLE =
  "Illustrazione didattica minimalista, stile vettoriale piatto e pulito, figura singola, sfondo neutro chiaro, nessun testo.";

/**
 * Thumbnail (cover) dell'esercizio. null per corsa o se non disponibile.
 */
export async function getOrCreateExerciseImage(name: string): Promise<string | null> {
  const clean = name.trim();
  if (!clean || isRunningExercise(clean)) return null;
  const key = slugify(clean);
  if (!key) return null;

  const existing = await db.exerciseMedia.findUnique({ where: { name: key } });
  if (existing) return existing.imagePath;
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const p = await generateAndSave(
      `${STYLE} Persona che esegue l'esercizio "${clean}", utile come guida.`,
      `${key}.png`,
    );
    if (!p) return null;
    await db.exerciseMedia.create({
      data: { name: key, displayName: clean, imagePath: p },
    });
    return p;
  } catch (e) {
    logger.warn("Generazione immagine esercizio fallita", e);
    return null;
  }
}

/**
 * Sequenza di esecuzione (3 fasi). Vuoto per corsa o se non disponibile.
 */
export async function getOrCreateExerciseSequence(
  name: string,
  force = false,
): Promise<SeqStep[]> {
  const clean = name.trim();
  if (!clean || isRunningExercise(clean)) return [];
  const key = slugify(clean);
  if (!key) return [];

  const existing = await db.exerciseMedia.findUnique({ where: { name: key } });
  const seqExisting = (existing?.sequence as unknown as SeqStep[] | null) ?? null;
  if (!force && seqExisting && Array.isArray(seqExisting) && seqExisting.length)
    return seqExisting;
  if (!process.env.OPENAI_API_KEY) return [];

  try {
    const seq: SeqStep[] = [];
    for (const ph of PHASES) {
      const p = await generateAndSave(
        `${STYLE} Mostra la FASE "${ph.caption}" (${ph.hint}) dell'esercizio "${clean}".`,
        `${key}-seq${ph.key}.png`,
      );
      if (p) seq.push({ path: p, caption: ph.caption });
    }
    if (!seq.length) return [];
    const cover = seq[0].path;
    await db.exerciseMedia.upsert({
      where: { name: key },
      update: { sequence: seq as object },
      create: { name: key, displayName: clean, imagePath: cover, sequence: seq as object },
    });
    return seq;
  } catch (e) {
    logger.warn("Generazione sequenza esercizio fallita", e);
    return [];
  }
}

/**
 * Pre-genera in background thumbnail + sequenza per un elenco di esercizi
 * (esclusa la corsa), popolando la libreria comune.
 */
export async function pregenerateExerciseImages(names: string[]): Promise<void> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  let done = 0;
  for (const name of unique) {
    if (isRunningExercise(name)) continue;
    try {
      const seq = await getOrCreateExerciseSequence(name);
      if (seq.length) done++;
      else await getOrCreateExerciseImage(name);
    } catch {
      /* continua */
    }
  }
  if (done > 0) logger.info(`Pre-generate sequenze per ${done} esercizi`);
}
