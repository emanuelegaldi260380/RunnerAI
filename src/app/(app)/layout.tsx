import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAccessState } from "@/lib/subscription";
import NavLink from "@/components/NavLink";
import SignOutButton from "@/components/SignOutButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { LangProvider } from "@/components/LangProvider";
import { isAdminEmail } from "@/lib/admin";
import { t } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const lang = await getServerLang();
  const tt = (k: string) => t(lang, k);
  const access = await getAccessState(session.user.id);

  const baseNav = [
    { href: "/dashboard", label: tt("nav.dashboard"), icon: "🏠" },
    { href: "/activities", label: tt("an.activities"), icon: "🏃" },
    { href: "/plan", label: tt("an.plan"), icon: "🗓️" },
    { href: "/profile", label: tt("an.profile"), icon: "👤" },
    { href: "/knowledge", label: tt("an.knowledge"), icon: "📚" },
    { href: "/billing", label: tt("an.billing"), icon: "💳" },
  ];
  const nav = isAdminEmail(session.user.email)
    ? [...baseNav, { href: "/admin", label: tt("an.admin"), icon: "🛠️" }]
    : baseNav;

  return (
    <div className="flex min-h-full flex-1">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border p-4 md:flex">
        <Link href="/" className="mb-6 px-3 text-lg font-bold">
          Runner<span className="text-brand">AI</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <NavLink key={n.href} {...n} />
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between px-3 pt-4">
          <div className="truncate text-xs text-muted">
            {session.user.name ?? session.user.email}
          </div>
          <SignOutButton variant="link" label={tt("nav.logout")} />
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-8">
          <Link href="/" className="text-lg font-bold md:hidden">
            Runner<span className="text-brand">AI</span>
          </Link>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher current={lang} />
            <span className="hidden text-sm text-muted sm:block">
              {session.user.name ?? session.user.email}
            </span>
            <SignOutButton label={tt("nav.logout")} />
          </div>
        </header>

        {!access.hasAccess ? (
          <div className="bg-red-500/10 px-6 py-2 text-center text-sm text-red-500">
            {tt("banner.expired")}{" "}
            <Link href="/billing" className="font-medium underline">
              {tt("banner.activate")}
            </Link>{" "}
            {tt("banner.toContinue")}
          </div>
        ) : access.inTrial ? (
          <div className="bg-brand/10 px-6 py-2 text-center text-sm text-brand">
            {tt("banner.trial")} {access.trialDaysLeft} {tt("banner.daysLeft")}{" "}
            <Link href="/billing" className="font-medium underline">
              {tt("banner.upgrade")}
            </Link>
          </div>
        ) : null}

        {/* Mobile top nav */}
        <div className="flex items-center gap-4 overflow-x-auto border-b border-border px-4 py-2 md:hidden">
          {nav.map((n) => (
            <NavLink key={n.href} {...n} />
          ))}
        </div>

        <main className="flex-1 p-6 md:p-8">
          <LangProvider lang={lang}>{children}</LangProvider>
        </main>
      </div>
    </div>
  );
}
