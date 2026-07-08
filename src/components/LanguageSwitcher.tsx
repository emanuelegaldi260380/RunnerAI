"use client";

import { useRouter } from "next/navigation";

const LANGS: { code: string; label: string }[] = [
  { code: "it", label: "🇮🇹 IT" },
  { code: "en", label: "🇬🇧 EN" },
  { code: "es", label: "🇪🇸 ES" },
];

export default function LanguageSwitcher({ current }: { current: string }) {
  const router = useRouter();

  function set(l: string) {
    document.cookie = `lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  return (
    <select
      aria-label="Lingua"
      value={current}
      onChange={(e) => set(e.target.value)}
      className="rounded-full border border-border bg-white px-2 py-1.5 text-sm font-medium outline-none focus:border-brand"
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
