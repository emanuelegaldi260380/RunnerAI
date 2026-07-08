"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/LangProvider";

export default function ProfileTabs() {
  const pathname = usePathname();
  const tr = useT();
  const tabs = [
    { href: "/profile", label: tr("tabs.physical") },
    { href: "/profile/settings", label: tr("tabs.technical") },
  ];
  return (
    <div className="mb-6 flex gap-1 border-b border-border">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`focus-ring -mb-px rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition ${
              active
                ? "border-brand text-brand"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
