/**
 * Chart chrome and ramps, one palette per theme. Values are validated, not
 * eyeballed.
 *
 * Recharts needs literal colours — it writes them straight into SVG paint
 * attributes — so these can't simply be the CSS tokens. Components read them
 * through `useViz()`, which swaps the whole object when the theme changes.
 *
 * DARK, measured on the card surface (#1F1C18):
 *   accent   categorical slot 1 — passes band/chroma/contrast
 *   heat     single-hue blue, low→high; monotone lightness, adjacent ΔL ≥ 0.06,
 *            darkest step 2.19:1
 *
 * LIGHT, measured on the card surface (#FEFDFB):
 *   accent   4.87:1 — thin marks need 3:1, so there is headroom
 *   heat     runs the other way, light→dark, because on paper "more" reads as
 *            darker; monotone lightness, adjacent ΔL ≥ 0.085, darkest 7.81:1
 *
 * Habit colors are NOT sourced here on purpose: a habit's color is chosen by the
 * user and persisted, so color follows the entity everywhere it appears. Those
 * eight hues were chosen against the dark surface — see CLAUDE.md for which of
 * them thin out on the light one.
 */
export interface VizPalette {
  /** The card colour, for punching a mark out of a line or dot. */
  surface: string;
  grid: string;
  axis: string;
  muted: string;
  textSecondary: string;
  textPrimary: string;
  /**
   * Chart data stays cool while the interface accent stays warm amber. The
   * split is deliberate: nothing on a chart is clickable, so data should never
   * wear the color that means "you can press this".
   */
  accent: string;
  /** Sequential, single hue, low → high. */
  heat: readonly string[];
  /** A day with no logged time reads as surface, not as the end of the ramp. */
  heatEmpty: string;
}

export const VIZ_DARK: VizPalette = {
  surface: "#1F1C18",
  grid: "#2F2A23",
  axis: "#403930",
  muted: "#6F6659",
  textSecondary: "#A69D8E",
  textPrimary: "#EAE4D9",
  accent: "#3987e5",
  heat: ["#184f95", "#256abf", "#3987e5", "#6da7ec", "#b7d3f6"],
  heatEmpty: "#2F2A23",
};

export const VIZ_LIGHT: VizPalette = {
  surface: "#FEFDFB",
  grid: "#E4DFD7",
  axis: "#CEC6BA",
  muted: "#8F8376",
  textSecondary: "#6D6254",
  textPrimary: "#342B23",
  accent: "#1f6fd0",
  heat: ["#CFE1F8", "#9FC0EC", "#6398DB", "#3272C4", "#175099"],
  /**
   * Warm grey against a cool ramp. The faintest step sits only 1.09:1 from it,
   * so hue is what separates "nothing logged" from "a little" — which is why
   * every chart ships the table-view twin in `ChartCard`.
   */
  heatEmpty: "#EDE8E0",
};

export function heatColor(hours: number, max: number, viz: VizPalette) {
  if (hours <= 0) return viz.heatEmpty;
  if (max <= 0) return viz.heat[0];
  const step = Math.ceil((hours / max) * viz.heat.length) - 1;
  return viz.heat[Math.min(Math.max(step, 0), viz.heat.length - 1)];
}
