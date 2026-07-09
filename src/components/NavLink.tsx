"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";

export default function NavLink({
  href,
  label,
  icon,
  layout = "row",
  onNavigate,
}: {
  href: string;
  label: string;
  icon: string;
  /** "row" = sidebar (icona + testo), "stack" = bottom bar (icona sopra, testo piccolo). */
  layout?: "row" | "stack";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  if (layout === "stack") {
    return (
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`focus-ring flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-medium transition ${
          active ? "text-brand" : "text-muted hover:text-foreground"
        }`}
      >
        <Icon name={icon} size={22} />
        <span className="leading-none">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
        active
          ? "bg-brand/10 font-medium text-brand"
          : "text-muted hover:bg-black/5 hover:text-foreground"
      }`}
    >
      <Icon name={icon} size={18} />
      {label}
    </Link>
  );
}
