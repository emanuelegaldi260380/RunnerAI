import crypto from "crypto";

// ---------------------------------------------------------------------------
// Storage oggetti S3-compatibile (Cloudflare R2, AWS S3, Backblaze B2, MinIO…).
//
// Perché serve: su hosting serverless (Vercel/anche molti PaaS) il filesystem è
// effimero e `public/` è di sola lettura a runtime → le immagini generate
// (esercizi, KB) e gli screenshot NON persistono. Questo driver carica gli
// oggetti su uno storage esterno quando configurato, con FALLBACK trasparente
// al filesystem locale in sviluppo.
//
// Nessuna dipendenza aggiuntiva: la firma AWS SigV4 è implementata con `crypto`
// nativo (verificata contro il test vector ufficiale AWS in storage.test.ts).
//
// Config (env):
//   S3_ENDPOINT           es. https://<accountid>.r2.cloudflarestorage.com
//   S3_BUCKET             nome del bucket
//   S3_ACCESS_KEY_ID
//   S3_SECRET_ACCESS_KEY
//   S3_REGION             opzionale (default "auto" per R2)
//   S3_PUBLIC_BASE_URL    opzionale, URL pubblico di lettura (CDN/dominio bucket)
// ---------------------------------------------------------------------------

export function storageConfigured(): boolean {
  return (
    !!process.env.S3_ENDPOINT &&
    !!process.env.S3_BUCKET &&
    !!process.env.S3_ACCESS_KEY_ID &&
    !!process.env.S3_SECRET_ACCESS_KEY
  );
}

function sha256hex(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}
function hmac(key: string | Buffer, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

/** Encoding RFC 3986 (AWS non tratta come sicuri i caratteri di encodeURIComponent). */
function encodeRfc3986(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}
/** Encoda un path preservando gli slash tra i segmenti. */
function encodePath(path: string): string {
  return path
    .split("/")
    .map((seg) => encodeRfc3986(seg))
    .join("/");
}

export interface SigV4Input {
  method: string;
  /** path canonico già assoluto, es. "/bucket/key.png" */
  canonicalPath: string;
  region: string;
  service: string; // "s3"
  accessKeyId: string;
  secretAccessKey: string;
  /** header da firmare (lowercase → value). Deve includere host e x-amz-date. */
  headers: Record<string, string>;
  payloadHash: string; // sha256hex del body (o "UNSIGNED-PAYLOAD")
  amzDate: string; // formato AMZ: YYYYMMDDTHHMMSSZ
}

export interface SigV4Result {
  authorization: string;
  signature: string;
  signedHeaders: string;
  credentialScope: string;
}

/** Firma AWS Signature Version 4 (generica, testabile contro i vettori AWS). */
export function sigv4Sign(input: SigV4Input): SigV4Result {
  const date = input.amzDate.slice(0, 8); // YYYYMMDD
  const names = Object.keys(input.headers)
    .map((n) => n.toLowerCase())
    .sort();
  const canonicalHeaders =
    names.map((n) => `${n}:${input.headers[n].trim()}`).join("\n") + "\n";
  const signedHeaders = names.join(";");

  const canonicalRequest = [
    input.method.toUpperCase(),
    input.canonicalPath,
    "", // query string (non usata nelle PUT/DELETE dirette)
    canonicalHeaders,
    signedHeaders,
    input.payloadHash,
  ].join("\n");

  const credentialScope = `${date}/${input.region}/${input.service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    input.amzDate,
    credentialScope,
    sha256hex(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${input.secretAccessKey}`, date);
  const kRegion = hmac(kDate, input.region);
  const kService = hmac(kRegion, input.service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto
    .createHmac("sha256", kSigning)
    .update(stringToSign, "utf8")
    .digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { authorization, signature, signedHeaders, credentialScope };
}

function amzDateNow(): string {
  // Nota: Date qui è runtime-side (non nel flusso workflow), quindi ammesso.
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
}

/**
 * Carica un oggetto sullo storage S3-compatibile. Ritorna l'URL pubblico di
 * lettura. Lancia se lo storage non è configurato o la PUT fallisce.
 */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Storage S3 non configurato");
  }
  const region = process.env.S3_REGION || "auto";
  const host = new URL(endpoint).host;
  const cleanKey = key.replace(/^\/+/, "");
  const canonicalPath = `/${bucket}/${encodePath(cleanKey)}`;
  const amzDate = amzDateNow();
  const payloadHash = sha256hex(body);

  const headers: Record<string, string> = {
    host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    "content-type": contentType,
  };
  const { authorization } = sigv4Sign({
    method: "PUT",
    canonicalPath,
    region,
    service: "s3",
    accessKeyId,
    secretAccessKey,
    headers,
    payloadHash,
    amzDate,
  });

  const res = await fetch(`${endpoint.replace(/\/$/, "")}${canonicalPath}`, {
    method: "PUT",
    headers: { ...headers, authorization },
    body: new Uint8Array(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Storage PUT ${res.status}: ${detail.slice(0, 200)}`);
  }
  const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  return base ? `${base}/${cleanKey}` : `${endpoint.replace(/\/$/, "")}${canonicalPath}`;
}
