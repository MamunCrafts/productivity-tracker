"use client";

import { VIZ_DARK, VIZ_LIGHT, type VizPalette } from "@/lib/viz";
import { useTheme } from "./useTheme";

/**
 * The chart palette for the current theme. Recharts writes colours into SVG
 * paint attributes, so charts can't inherit the CSS tokens the way the rest of
 * the interface does — they have to be handed literals that change with it.
 */
export function useViz(): VizPalette {
  return useTheme() === "light" ? VIZ_LIGHT : VIZ_DARK;
}
