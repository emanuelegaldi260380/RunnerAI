import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";

export type Provider = "strava" | "garmin";

export interface TokenSet {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scope?: string | null;
  externalUserId?: string | null;
}

/** Salva/aggiorna una connessione con token CIFRATI */
export async function saveConnection(
  userId: string,
  provider: Provider,
  tokens: TokenSet,
) {
  const data = {
    accessTokenEnc: encrypt(tokens.accessToken),
    refreshTokenEnc: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
    expiresAt: tokens.expiresAt ?? null,
    scope: tokens.scope ?? null,
    externalUserId: tokens.externalUserId ?? null,
    status: "connected",
  };
  return db.integrationConnection.upsert({
    where: { userId_provider: { userId, provider } },
    update: data,
    create: { userId, provider, ...data },
  });
}

/** Legge i token in chiaro (solo lato server, mai esposti al client) */
export function readTokens(conn: {
  accessTokenEnc: string;
  refreshTokenEnc: string | null;
}): { accessToken: string; refreshToken: string | null } {
  return {
    accessToken: decrypt(conn.accessTokenEnc),
    refreshToken: conn.refreshTokenEnc ? decrypt(conn.refreshTokenEnc) : null,
  };
}

export async function getConnection(userId: string, provider: Provider) {
  return db.integrationConnection.findUnique({
    where: { userId_provider: { userId, provider } },
  });
}

export async function disconnect(userId: string, provider: Provider) {
  await db.integrationConnection.deleteMany({ where: { userId, provider } });
}
