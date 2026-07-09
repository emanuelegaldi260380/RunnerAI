"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import NavLink from "@/components/NavLink";
import SignOutButton from "@/components/SignOutButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Icon from "@/components/Icon";
import { useT } from "@/components/LangProvider";

interface Item {
  href: string;
  label: string;
  icon: string;
}

/**
 * Navigazione mobile: bottom navigation bar fissa (max 5 destinazioni) +
 * drawer "Altro" per le voci secondarie (Material 3 – Navigation bar,
 * Apple HIG – Tab Bars). Sostituisce la vecchia striscia a scroll orizzontale,
 * poco scopribile (NN/g).
 */
export default function MobileNav({
  primary,
  secondary,
  lang,
  logoutLabel,
}: {
  primary: Item[];
  secondary: Item[];
  lang: string;
  logoutLabel: string;
}) {
  const tr = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // chiudi il drawer quando cambia rotta: aggiornamento di stato durante il
  // render (pattern React consigliato) invece di un effect, così non innesca
  // render a cascata (react-hooks/set-state-in-effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  // chiusura con Esc + blocco scroll quando il drawer è aperto
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const moreActive = secondary.some(
    (s) => pathname === s.href || pathname.startsWith(s.href + "/"),
  );

  return (
    <>
      {/* Bottom navigation bar */}
      <nav
        aria-label={tr("nav.primary")}
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-1 border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-1px_8px_rgba(0,0,0,0.04)] backdrop-blur md:hidden"
      >
        {primary.map((n) => (
          <NavLink key={n.href} {...n} layout="stack" />
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={`focus-ring flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-medium transition ${
            moreActive ? "text-brand" : "text-muted hover:text-foreground"
          }`}
        >
          <Icon name="more" size={22} />
          <span className="leading-none">{tr("nav.more")}</span>
        </button>
      </nav>

      {/* Drawer "Altro" */}
      {open && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={tr("nav.menu")}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-card p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold">{tr("nav.menu")}</span>
              <button
                onClick={() => setOpen(false)}
                aria-label={tr("nav.close")}
                className="focus-ring flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-black/5 hover:text-foreground"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {secondary.map((n) => (
                <NavLink key={n.href} {...n} onNavigate={() => setOpen(false)} />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <LanguageSwitcher current={lang} />
              <SignOutButton label={logoutLabel} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
