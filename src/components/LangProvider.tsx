"use client";

import { createContext, useContext } from "react";
import { t as translate, type Lang } from "@/lib/i18n";

const LangContext = createContext<Lang>("it");

export function LangProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** Hook di traduzione per i componenti client */
export function useT() {
  const lang = useContext(LangContext);
  return (key: string) => translate(lang, key);
}

export function useLang(): Lang {
  return useContext(LangContext);
}
