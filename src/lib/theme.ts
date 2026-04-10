/** Persisted main-column theme (sidebar is always dark). */
export const MAIN_THEME_STORAGE_KEY = "watchtower-main-theme";

export type MainTheme = "light" | "dark";

export function readStoredMainTheme(): MainTheme | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(MAIN_THEME_STORAGE_KEY);
    if (v === "dark" || v === "light") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function applyMainThemeToDocument(theme: MainTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-main-theme", theme);
}

export function getMainThemeFromDocument(): MainTheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-main-theme") === "dark" ? "dark" : "light";
}

/** Client-only: sync with `data-main-theme` on `<html>` and cross-tab storage events. */
export function subscribeMainThemeFromDocument(onChange: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-main-theme"] });
  const onStorage = (event: StorageEvent) => {
    if (event.key === MAIN_THEME_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    observer.disconnect();
    window.removeEventListener("storage", onStorage);
  };
}
