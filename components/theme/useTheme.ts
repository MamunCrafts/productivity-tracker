"use client";

import { useSyncExternalStore } from "react";
import { getTheme, subscribeTheme, type Theme } from "@/lib/theme";

/**
 * The current theme, as a reactive value.
 *
 * `useSyncExternalStore` rather than `useState` + an effect: the theme lives on
 * the document element, set before hydration by the inline script, which makes
 * it external mutable state. It also keeps this clear of the
 * set-state-in-an-effect rule.
 *
 * The server snapshot is "dark", matching what plain `:root` declares — so
 * server-rendered markup and the CSS fallback always agree.
 */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, getTheme, serverSnapshot);
}

const serverSnapshot = (): Theme => "dark";
