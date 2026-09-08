import type { HighlightColor } from "@/types/books";

/**
 * The marker palette, and the one place it is defined — the picker in the
 * reader, the marks on the page, the swatch on a saved highlight and the API's
 * validator all read this array, so a sixth colour is one edit here.
 *
 * The values are **literal hexes rather than theme tokens**, for the same
 * reason `app/icon.svg` carries literal hex: a mark is painted on top of the
 * PDF's own page image, which is white paper in both themes and is not ours to
 * restyle. A `hsl(var(--amber))` mark would drift with the theme while the
 * paper underneath it stayed put.
 *
 * They are also *marker* colours, not the habit picker's eight identity hues:
 * each is painted at `MARK_OPACITY` with `mix-blend-mode: multiply` (see
 * `components/books/reader.css`), so what matters is that the black text stays
 * legible through it and that the five stay apart from each other at a third of
 * their strength. Measured over `#ffffff` at 0.35 multiply, the lightest of
 * them (yellow) still leaves body text above 10:1.
 *
 * Yellow is first and is the default, so a highlight saved before the picker
 * existed and one saved by pressing the first swatch look identical.
 */
export const HIGHLIGHT_COLORS: {
  key: HighlightColor;
  name: string;
  hex: string;
}[] = [
  { key: "yellow", name: "Yellow", hex: "#facc15" },
  { key: "green", name: "Green", hex: "#4ade80" },
  { key: "blue", name: "Blue", hex: "#60a5fa" },
  { key: "pink", name: "Pink", hex: "#f472b6" },
  { key: "purple", name: "Purple", hex: "#c084fc" },
];

export const DEFAULT_HIGHLIGHT_COLOR: HighlightColor = "yellow";

/** The keys, as the schema and the route validator want them. */
export const HIGHLIGHT_COLOR_KEYS = HIGHLIGHT_COLORS.map(
  (colour) => colour.key,
);

export function isHighlightColor(value: unknown): value is HighlightColor {
  return HIGHLIGHT_COLORS.some((colour) => colour.key === value);
}

/**
 * Tolerant on purpose: a legacy row has no colour and a row written by a newer
 * build could carry a key this one has never heard of, and neither is a reason
 * to paint nothing. Both fall back to the default marker.
 */
function entry(color: HighlightColor | undefined) {
  return (
    HIGHLIGHT_COLORS.find((colour) => colour.key === color) ??
    HIGHLIGHT_COLORS[0]
  );
}

export function highlightHex(color: HighlightColor | undefined) {
  return entry(color).hex;
}

export function highlightName(color: HighlightColor | undefined) {
  return entry(color).name;
}

/** The key a row is treated as, so grouping and filtering agree with painting. */
export function highlightKey(color: HighlightColor | undefined) {
  return entry(color).key;
}

/** How many saved highlights wear each colour, in palette order. */
export function countsByColor(
  highlights: { color?: HighlightColor }[],
): { key: HighlightColor; name: string; hex: string; count: number }[] {
  return HIGHLIGHT_COLORS.map((colour) => ({
    ...colour,
    count: highlights.filter((h) => highlightKey(h.color) === colour.key)
      .length,
  })).filter((colour) => colour.count > 0);
}
