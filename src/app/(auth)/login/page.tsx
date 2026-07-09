import Link from "next/link";
import GoogleButton from "@/components/GoogleButton";
import LoginForm from "@/components/LoginForm";
import { t as i18nT } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";

export default async function LoginPage() {
  const lang = await getServerLang();
  const tr = (k: string) => i18nT(lang, k);
  const googleEnabled =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-xl font-bold">
          Runner<span className="text-brand">AI</span>
        </Link>
        <div className="card">
          <h1 className="mb-1 text-2xl font-bold">{tr("login.title")}</h1>
          <p className="mb-6 text-sm text-muted">{tr("login.subtitle")}</p>

          {googleEnabled && (
            <>
              <GoogleButton label={tr("login.withGoogle")} />
              <div className="my-5 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-border" />
                {tr("auth.orEmail")}
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <LoginForm />
          <p className="mt-4 text-center text-sm">
            <Link href="/forgot" className="text-muted hover:text-brand hover:underline">
              {tr("login.forgot")}
            </Link>
          </p>
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          {tr("login.noAccount")}{" "}
          <Link href="/register" className="text-brand hover:underline">
            {tr("login.registerLink")}
          </Link>
        </p>
      </div>
    </main>
  );
}
