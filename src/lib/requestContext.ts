import { AsyncLocalStorage } from "node:async_hooks";

interface RequestCtx {
  userId?: string;
}

const als = new AsyncLocalStorage<RequestCtx>();

/** Esegue fn con lo userId corrente in contesto (per tracciamento token per-utente). */
export function runWithUser<T>(userId: string | undefined, fn: () => Promise<T>): Promise<T> {
  return als.run({ userId }, fn);
}

export function currentUserId(): string | undefined {
  return als.getStore()?.userId;
}
