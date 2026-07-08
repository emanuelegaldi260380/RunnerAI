import crypto from "crypto";
import { db } from "@/lib/db";

export async function createAuthToken(
  userId: string,
  type: "reset" | "verify",
  ttlMs: number,
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await db.authToken.create({
    data: { userId, token, type, expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

/** Valida e consuma un token; ritorna userId o null */
export async function consumeAuthToken(
  token: string,
  type: "reset" | "verify",
): Promise<string | null> {
  const rec = await db.authToken.findUnique({ where: { token } });
  if (!rec || rec.type !== type || rec.expiresAt < new Date()) return null;
  await db.authToken.delete({ where: { token } });
  return rec.userId;
}
