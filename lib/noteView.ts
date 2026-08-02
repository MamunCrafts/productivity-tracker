import type { Block } from "@/types/notes";

/**
 * The note helpers that carry no parser with them.
 *
 * Kept apart from `lib/markdown.ts` on purpose: that module pulls in remark,
 * and the reader, the card and the dropzone all need these few functions
 * without needing a markdown parser in the browser bundle. Only the import
 * screen loads the parser, and it does so dynamically.
 */

/**
 * A ceiling on the raw file, checked before it is ever read. Block JSON runs
 * roughly 2–3× the source in BSON, so 1MB of markdown lands well inside
 * Mongo's 16MB document limit — and 1MB of prose is ~150k words, far past
 * anything anyone reads in one sitting.
 */
export const MAX_NOTE_BYTES = 1_000_000;

/**
 * Only absolute URLs can actually load. A relative path like `./img/x.png`
 * pointed at a folder that was never imported, so it renders as a placeholder
 * instead of a broken image.
 */
export function isRenderableImage(url: string): boolean {
  return /^(https?:\/\/|data:image\/)/i.test(url.trim());
}

/**
 * Most markdown files open with their own title as an `# H1`, and the reader
 * already prints that title above the body — so it lands twice. Drop the
 * leading heading when it is the title.
 *
 * Matched rather than stripped at import: `content` keeps the file intact,
 * and renaming a note brings its original heading back into view instead of
 * leaving the note with no heading at all.
 */
export function dropRedundantTitle(blocks: Block[], title: string): Block[] {
  const [first] = blocks;
  if (
    first?.type === "heading" &&
    first.depth === 1 &&
    normalise(first.text) === normalise(title)
  ) {
    return blocks.slice(1);
  }
  return blocks;
}

function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Headings worth showing in a table of contents. h1 is the title; h4+ is noise. */
export function tableOfContents(blocks: Block[]) {
  return blocks.filter(
    (b): b is Extract<Block, { type: "heading" }> =>
      b.type === "heading" && b.depth >= 2 && b.depth <= 3
  );
}

/** ~200 words a minute, floored at a minute so nothing reads as "0 min". */
export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 200));
}

/**
 * Every tag in a set of notes with how many carry it, commonest first and
 * alphabetical within a tie.
 *
 * Ordered by weight rather than name because the filter row shows the head of
 * this list and folds the tail away — sorted alphabetically, the cut would fall
 * in an arbitrary place and hide the tag you reach for most. Counted over
 * whatever is passed in, so a folder's row offers only the tags that folder
 * actually holds and no choice in it can return nothing.
 */
export function tagCounts(
  notes: { tags: string[] }[]
): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts].
    map(([tag, count]) => ({ tag, count })).
    sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
