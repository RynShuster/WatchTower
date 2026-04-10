"use client";

import { useSyncExternalStore } from "react";
import { getMainThemeFromDocument, subscribeMainThemeFromDocument, type MainTheme } from "@/lib/theme";

export function useMainTheme(): MainTheme {
  return useSyncExternalStore(subscribeMainThemeFromDocument, getMainThemeFromDocument, () => "light");
}
