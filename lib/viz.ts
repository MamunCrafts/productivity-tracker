/**
 * Chart chrome and ramps for the dark surface the app renders on (zinc-900,
 * #18181b). Values are validated, not eyeballed:
 *
 *   accent          categorical slot 1 (dark) — passes band/chroma/contrast at #18181b
 *   HEAT_RAMP       single-hue sequential blue, low→high; monotone lightness,
 *                   adjacent ΔL ≥ 0.06, darkest step 2.19:1 on surface
 *
 * Habit colors are NOT sourced here on purpose: a habit's color is chosen by the
 * user and persisted, so color follows the entity everywhere it appears. Those
 * eight hues clear CVD separation (worst adjacent ΔE 8.1) and 3:1 contrast, but
 * sit above the dark lightness band — so they are used on thin marks and never
 * as large saturated fills, and identity always has a non-color channel
 * (axis label, legend, table view) beside them.
 */
export const VIZ = {
  /** Mirrors the CSS palette in globals.css — Recharts needs literal values. */
  surface: "#1F1C18",
  grid: "#2F2A23",
  axis: "#403930",
  muted: "#6F6659",
  textSecondary: "#A69D8E",
  textPrimary: "#EAE4D9",
  /**
   * Chart data stays cool while the interface accent stays warm amber. The
   * split is deliberate: nothing on a chart is clickable, so data should never
   * wear the color that means "you can press this".
   */
  accent: "#3987e5",
} as const;

export const HEAT_RAMP = ["#184f95", "#256abf", "#3987e5", "#6da7ec", "#b7d3f6"] as const;

/** A day with no logged time reads as surface, not as the bottom of the ramp. */
export const HEAT_EMPTY = "#2F2A23";

export function heatColor(hours: number, max: number) {
  if (hours <= 0) return HEAT_EMPTY;
  if (max <= 0) return HEAT_RAMP[0];
  const step = Math.ceil((hours / max) * HEAT_RAMP.length) - 1;
  return HEAT_RAMP[Math.min(Math.max(step, 0), HEAT_RAMP.length - 1)];
}
