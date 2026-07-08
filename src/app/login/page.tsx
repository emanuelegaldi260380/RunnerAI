import Link from "next/link";
import GoogleButton from "@/components/GoogleButton";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  const googleEnabled =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-xl font-bold">
          Runner<span className="text-brand">AI</span>
        </Link>
        <div className="card">
          <h1 className="mb-1 text-2xl font-bold">Accedi</h1>
          <p className="mb-6 text-sm text-muted">Bentornato, corridore.</p>

          {googleEnabled && (
            <>
              <GoogleButton label="Accedi con Google" />
              <div className="my-5 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-border" />
                oppure con email
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <LoginForm />
          <p className="mt-4 text-center text-sm">
            <Link href="/forgot" className="text-muted hover:text-brand hover:underline">
              Password dimenticata?
            </Link>
          </p>
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          Non hai un account?{" "}
          <Link href="/register" className="text-brand hover:underline">
            Registrati
          </Link>
        </p>
      </div>
    </main>
  );
}
