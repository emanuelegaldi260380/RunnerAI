import Link from "next/link";
import GoogleRegister from "@/components/GoogleRegister";
import RegisterForm from "@/components/RegisterForm";
import PlansOverview from "@/components/PlansOverview";
import { t as i18nT } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";

export default async function RegisterPage() {
  const lang = await getServerLang();
  const tr = (k: string) => i18nT(lang, k);
  const googleEnabled =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto w-full max-w-md">
        <Link
          href="/"
          className="focus-ring mb-8 block rounded-lg text-center text-xl font-bold"
        >
          Runner<span className="text-brand">AI</span>
        </Link>
        <div className="card">
          <h1 className="mb-1 text-2xl font-bold">{tr("reg.title")}</h1>
          <p className="mb-6 text-sm text-muted">{tr("reg.subtitle")}</p>

          <GoogleRegister label={tr("reg.withGoogle")} />

          {!googleEnabled && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-border" />
                {tr("auth.orEmail")}
                <span className="h-px flex-1 bg-border" />
              </div>
              <RegisterForm />
              <p className="mt-3 text-center text-xs text-muted">
                {tr("reg.googleNotConfigured")}
              </p>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          {tr("reg.haveAccount")}{" "}
          <Link href="/login" className="focus-ring rounded text-brand hover:underline">
            {tr("reg.loginLink")}
          </Link>
        </p>
      </div>

      {/* Dettaglio piani consultabile in fase di registrazione */}
      <div className="mx-auto mt-12 max-w-3xl">
        <h2 className="text-center text-xl font-bold">{tr("reg.plansTitle")}</h2>
        <p className="mx-auto mb-5 mt-1 max-w-xl text-center text-sm text-muted">
          {tr("reg.plansIntroPre")}
          <b>{tr("reg.plansIntroBold")}</b>
          {tr("reg.plansIntroPost")}
        </p>
        <PlansOverview />
      </div>
    </main>
  );
}
