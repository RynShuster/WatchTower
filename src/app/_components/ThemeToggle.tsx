"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  MAIN_THEME_STORAGE_KEY,
  applyMainThemeToDocument,
  getMainThemeFromDocument,
  readStoredMainTheme,
  subscribeMainThemeFromDocument,
  type MainTheme,
} from "@/lib/theme";

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeMainThemeFromDocument, getMainThemeFromDocument, () => "light");
  const isDark = theme === "dark";

  const toggle = useCallback(() => {
    const stored = readStoredMainTheme();
    const current: MainTheme =
      stored ?? (document.documentElement.getAttribute("data-main-theme") === "dark" ? "dark" : "light");
    const next: MainTheme = current === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(MAIN_THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyMainThemeToDocument(next);
  }, []);

  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button type="button" className="themeToggle" onClick={toggle} aria-label={label} aria-pressed={isDark} title={label}>
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
