import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessState } from "@/lib/subscription";
import { checkLimit } from "@/lib/plans";
import { matchActivityToPlan } from "@/lib/services/matchWorkout";
import { assessActivity } from "@/lib/services/assessActivity";
import { getServerLang } from "@/lib/i18n-server";
import { runWithUser } from "@/lib/requestContext";
import { rateLimit } from "@/lib/rateLimit";
import { extractActivityFromImages } from "@/lib/services/ingest";
import type { ImageInput } from "@/lib/llm/types";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Limiti anti-abuso: gli screenshot sono pochi e piccoli. Evitano DoS
// (RAM/disco) e invii costosi all'LLM vision.
const MAX_FILES = 5;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB per file

// Firma binaria (magic bytes) -> media type. Non ci si fida dell'estensione.
function sniffMediaType(buf: Buffer): ImageInput["mediaType"] | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  )) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return "image/jpeg";
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) return "image/webp";
  return null;
}

function extFor(mediaType: ImageInput["mediaType"]): string {
  if (mediaType === "image/jpeg") return ".jpg";
  if (mediaType === "image/webp") return ".webp";
  return ".png";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const access = await getAccessState(session.user.id);
  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "Abbonamento non attivo" },
      { status: 402 },
    );
  }

  if (!(await rateLimit(`ingest:${session.user.id}`, 15, 60_000))) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova tra poco." },
      { status: 429 },
    );
  }

  const limit = await checkLimit(session.user.id, "ingest");
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Limite mensile analisi raggiunto (${limit.used}/${limit.limit}). Passa a un piano superiore.`,
        limitReached: true,
      },
      { status: 429 },
    );
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Nessun file" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Troppi file: massimo ${MAX_FILES} per richiesta.` },
      { status: 400 },
    );
  }

  const images: ImageInput[] = [];
  const savedPaths: string[] = [];

  // Directory best-effort: su filesystem effimero/read-only (serverless) la
  // scrittura può fallire (EROFS). L'ingest NON deve dipenderne: gli screenshot
  // servono solo come riferimento, l'estrazione lavora sui buffer in memoria.
  const userDir = path.join(UPLOAD_DIR, session.user.id);
  let canPersist = true;
  try {
    await fs.mkdir(userDir, { recursive: true });
  } catch {
    canPersist = false;
  }

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File "${file.name}" troppo grande (max 8 MB).` },
        { status: 400 },
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File "${file.name}" troppo grande (max 8 MB).` },
        { status: 400 },
      );
    }
    const mediaType = sniffMediaType(buf);
    if (!mediaType) {
      return NextResponse.json(
        { error: `Formato non supportato per "${file.name}": usa PNG, JPEG o WebP.` },
        { status: 400 },
      );
    }
    images.push({ base64: buf.toString("base64"), mediaType });

    if (canPersist) {
      const fname = `${crypto.randomUUID()}${extFor(mediaType)}`;
      const rel = path.join(session.user.id, fname);
      try {
        await fs.writeFile(path.join(UPLOAD_DIR, rel), buf);
        savedPaths.push(rel.replace(/\\/g, "/"));
      } catch {
        canPersist = false; // read-only FS: smette di tentare, prosegue senza persistenza
      }
    }
  }

  let extracted;
  try {
    extracted = await runWithUser(session.user.id, () =>
      extractActivityFromImages(images),
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          "Estrazione fallita: " +
          (e instanceof Error ? e.message : "errore sconosciuto"),
      },
      { status: 500 },
    );
  }

  const activity = await db.activity.create({
    data: {
      userId: session.user.id,
      source: "SCREENSHOT",
      type: extracted.type ?? undefined,
      date: extracted.date ? new Date(extracted.date) : new Date(),
      distanceKm: extracted.distanceKm ?? undefined,
      durationSec: extracted.durationSec ?? undefined,
      avgPaceSecPerKm: extracted.avgPaceSecPerKm ?? undefined,
      avgHr: extracted.avgHr ?? undefined,
      maxHr: extracted.maxHr ?? undefined,
      elevationGainM: extracted.elevationGainM ?? undefined,
      calories: extracted.calories ?? undefined,
      cadence: extracted.cadence ?? undefined,
      splits: extracted.splits ?? undefined,
      hrZones: extracted.hrZones ?? undefined,
      rawExtract: extracted as object,
      screenshotPath: savedPaths[0],
      notes: extracted.notes ?? undefined,
    },
  });

  // collega al workout pianificato dello stesso giorno (se presente)
  await matchActivityToPlan(
    session.user.id,
    activity.id,
    activity.date,
    activity.type,
  ).catch(() => {});

  // giudizio di merito dell'AI su quanto svolto (+ consiglio di revisione piano)
  const lang = await getServerLang();
  const assessment = await runWithUser(session.user.id, () =>
    assessActivity(session.user.id, activity.id, lang),
  ).catch(() => null);

  return NextResponse.json(
    { ok: true, activity, extracted, assessment },
    { status: 201 },
  );
}
