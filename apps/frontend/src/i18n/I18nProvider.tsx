"use client";

import { useEffect, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n, { isRtl, SUPPORTED_LOCALES, type Locale } from "./config";

function HtmlDirSync() {
  const { i18n: i18nInstance } = useTranslation();

  useEffect(() => {
    const apply = (lng: string) => {
      const locale = (SUPPORTED_LOCALES as readonly string[]).includes(lng)
        ? (lng as Locale)
        : "en";
      const dir = isRtl(locale) ? "rtl" : "ltr";
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("lang", locale);
        document.documentElement.setAttribute("dir", dir);
      }
    };
    apply(i18nInstance.language);
    i18nInstance.on("languageChanged", apply);
    return () => {
      i18nInstance.off("languageChanged", apply);
    };
  }, [i18nInstance]);

  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <HtmlDirSync />
      {children}
    </I18nextProvider>
  );
}
