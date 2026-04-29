"use client";

import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from "./config";

interface LanguageSwitchProps {
  collapsed?: boolean;
  className?: string;
}

export function LanguageSwitch({ collapsed = false, className }: LanguageSwitchProps) {
  const { i18n, t } = useTranslation();
  const current = (SUPPORTED_LOCALES as readonly string[]).includes(i18n.language)
    ? (i18n.language as Locale)
    : "en";

  const next: Locale = current === "en" ? "ar" : "en";

  const handleToggle = () => {
    void i18n.changeLanguage(next);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={t("language.label")}
      title={`${t("language.label")}: ${LOCALE_LABELS[current]}`}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-2 rounded-md text-sm",
        "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
        "transition-colors",
        className,
      )}
    >
      <Languages className="w-4 h-4 flex-shrink-0" />
      {!collapsed && (
        <span className="truncate">{LOCALE_LABELS[current]}</span>
      )}
    </button>
  );
}
