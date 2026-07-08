"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
        active
          ? "bg-brand/10 font-medium text-brand"
          : "text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
      }`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </Link>
  );
}
