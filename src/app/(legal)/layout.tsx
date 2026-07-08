import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="flex-1">
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-xl font-extrabold tracking-tight">
              Runner<span className="text-brand">AI</span>
            </Link>
            <Link href="/" className="text-sm text-muted hover:text-foreground">
              ← Home
            </Link>
          </div>
        </header>
        <article className="mx-auto max-w-3xl px-6 py-12 prose-legal">{children}</article>
      </main>
      <SiteFooter />
    </>
  );
}
