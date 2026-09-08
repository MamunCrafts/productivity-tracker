/**
 * The five marker colours a highlight can be saved in. Stored as the key, not
 * the hex, so the swatch can be re-tuned later without a migration — the same
 * reason a habit stores its own hex and a note stores its own markdown: what
 * the user chose is the durable part, how it is painted is not.
 */
export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "purple";

// Highlight coordinates are fractions of the rendered PDF page.
export type Highlight = {
  id: string;
  page: number;
  text: string;
  /**
   * Absent on rows saved before colours existed, and `GET` reads with `.lean()`
   * so Mongoose's default never fills it in. Read it through `highlightHex` /
   * `highlightName` in `lib/highlights.ts`, never off the row — the same
   * read-time convention `focusOutOf10` uses for the old 1-5 focus scale.
   */
  color?: HighlightColor;
  rectangles: { x: number; y: number; width: number; height: number }[];
};

export type Book = {
  id: string;
  title: string;
  categoryId: string | null;
  sourceFilename: string;
  bytes: number;
  currentPage: number;
  /**
   * Whether page 1 has been rendered to a cover in R2 — the reader does that
   * on the first open, so a book uploaded before covers existed gets one the
   * next time it is read rather than needing a backfill. The key itself is
   * derived server-side (`bookCoverKey`) and never sent.
   */
  hasCover?: boolean;
  highlights: Highlight[];
  createdAt: string;
};
