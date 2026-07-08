import Link from "next/link";
import GoogleRegister from "@/components/GoogleRegister";
import RegisterForm from "@/components/RegisterForm";
import PlansOverview from "@/components/PlansOverview";

export default function RegisterPage() {
  const googleEnabled =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="mb-8 block text-center text-xl font-bold">
          Runner<span className="text-brand">AI</span>
        </Link>
        <div className="card">
          <h1 className="mb-1 text-2xl font-bold">Crea il tuo account</h1>
          <p className="mb-6 text-sm text-muted">
            14 giorni di prova gratuita. Nessuna carta richiesta ora.
          </p>

          <GoogleRegister label="Registrati con Google" />

          {!googleEnabled && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-border" />
                oppure con email
                <span className="h-px flex-1 bg-border" />
              </div>
              <RegisterForm />
              <p className="mt-3 text-center text-xs text-muted">
                (Google non configurato: registrazione email disponibile in
                sviluppo)
              </p>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          Hai già un account?{" "}
          <Link href="/login" className="text-brand hover:underline">
            Accedi
          </Link>
        </p>
      </div>

      {/* Dettaglio piani consultabile in fase di registrazione */}
      <div className="mx-auto mt-12 max-w-3xl">
        <h2 className="text-center text-xl font-bold">I nostri piani</h2>
        <p className="mx-auto mb-5 mt-1 max-w-xl text-center text-sm text-muted">
          Inizi con <b>14 giorni di prova gratuita</b> (con limiti ridotti), poi
          scegli il piano più adatto. Puoi disdire quando vuoi.
        </p>
        <PlansOverview />
      </div>
    </main>
  );
}
