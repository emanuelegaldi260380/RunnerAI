import { LangProvider } from "@/components/LangProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getServerLang } from "@/lib/i18n-server";

/**
 * Layout condiviso delle pagine pubbliche di autenticazione (login, registrazione,
 * password dimenticata, reset). Fornisce il contesto lingua (LangProvider) anche
 * fuori dal gruppo (app), così i form client sono localizzati, e uno switcher
 * lingua accessibile prima dell'accesso.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getServerLang();
  return (
    <LangProvider lang={lang}>
      <div className="flex justify-end px-6 pt-4">
        <LanguageSwitcher current={lang} />
      </div>
      {children}
    </LangProvider>
  );
}
