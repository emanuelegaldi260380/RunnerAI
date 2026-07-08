"use client";

import { useT } from "@/components/LangProvider";

/** Riapre il pannello di gestione dei cookie (il consenso è revocabile in ogni momento). */
export default function CookiePreferencesButton({
  className = "",
}: {
  className?: string;
}) {
  const tr = useT();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-cookie-preferences"))}
      className={className || "hover:text-foreground"}
    >
      {tr("cookie.manage")}
    </button>
  );
}
