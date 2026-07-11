import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { normalizeForVision, MAX_VISION_EDGE } from "./imagePrep";

// Crea un PNG in tinta unita delle dimensioni richieste.
async function png(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 10, g: 20, b: 30 },
    },
  })
    .png()
    .toBuffer();
}

describe("normalizeForVision", () => {
  it("lascia invariata un'immagine entro i limiti (stesso buffer)", async () => {
    const buf = await png(1080, 1920);
    const out = await normalizeForVision(buf);
    expect(out).toBe(buf); // nessuna ricodifica
  });

  it("ridimensiona uno screenshot 'lungo' che sfora in altezza", async () => {
    // Caso reale: screenshot Garmin con tutti gli split -> altezza > 8000px.
    const buf = await png(1080, 12000);
    const out = await normalizeForVision(buf);
    const meta = await sharp(out).metadata();
    expect(meta.height).toBeLessThanOrEqual(MAX_VISION_EDGE);
    expect(meta.width).toBeLessThanOrEqual(MAX_VISION_EDGE);
    // proporzioni preservate: width scala con height (1080 * 7800/12000 = 702)
    expect(meta.width).toBe(702);
    expect(meta.height).toBe(MAX_VISION_EDGE);
  });

  it("ridimensiona un'immagine che sfora in larghezza", async () => {
    const buf = await png(10000, 800);
    const out = await normalizeForVision(buf);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(MAX_VISION_EDGE);
    expect(meta.height).toBeLessThanOrEqual(MAX_VISION_EDGE);
  });

  it("mantiene il formato di input (PNG resta PNG)", async () => {
    const buf = await png(9000, 9000);
    const out = await normalizeForVision(buf);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(MAX_VISION_EDGE);
    expect(meta.height).toBe(MAX_VISION_EDGE);
  });

  it("torna il buffer originale se l'immagine è illeggibile", async () => {
    const junk = Buffer.from("non è un'immagine", "utf8");
    const out = await normalizeForVision(junk);
    expect(out).toBe(junk);
  });
});
