import type { Metadata } from "next";
import { t } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";

/**
 * Titolo di pagina localizzato per l'area autenticata. Combinato con il
 * template del root layout produce "<Sezione> · RunnerAI"
 * (WCAG 2.2 – 2.4.2 Page Titled: ogni pagina ha un titolo univoco).
 */
export async function titleMeta(key: string): Promise<Metadata> {
  const lang = await getServerLang();
  return { title: t(lang, key) };
}
