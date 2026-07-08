import { cookies, headers } from "next/headers";
import { isLang, DEFAULT_LANG, type Lang } from "./i18n";

/** Lingua lato server: cookie 'lang' se presente, altrimenti Accept-Language (browser) */
export async function getServerLang(): Promise<Lang> {
  const c = await cookies();
  const ck = c.get("lang")?.value;
  if (isLang(ck)) return ck;
  const h = await headers();
  const al = h.get("accept-language") || "";
  const first = al.split(",")[0]?.split("-")[0]?.toLowerCase();
  if (isLang(first)) return first;
  return DEFAULT_LANG;
}
