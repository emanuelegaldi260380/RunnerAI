import crypto from "crypto";

/**
 * Cifratura a riposo dei token delle integrazioni (Strava/Garmin).
 * AES-256-GCM (cifratura autenticata): un eventuale dump del DB non espone
 * i token in chiaro senza ENCRYPTION_KEY (che vive solo nell'ambiente/secret manager).
 *
 * Formato serializzato: "v1:<iv b64>:<authTag b64>:<ciphertext b64>"
 */

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const k = process.env.ENCRYPTION_KEY;
  if (!k) throw new Error("ENCRYPTION_KEY mancante");
  const buf = Buffer.from(k, "base64");
  if (buf.length !== 32) {
    throw new Error("ENCRYPTION_KEY deve essere 32 byte codificati in base64");
  }
  return buf;
}

export function encryptionConfigured(): boolean {
  if (!process.env.ENCRYPTION_KEY) return false;
  try {
    return getKey().length === 32;
  } catch {
    return false;
  }
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decrypt(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Payload cifrato non valido");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = crypto.createDecipheriv(
    ALGO,
    getKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
