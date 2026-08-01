/**
 * Notes are markdown imported once and read many times, so the parse happens
 * at write time rather than on every view: `content` holds the original file
 * byte-for-byte, `blocks` holds the JSON tree the reader renders.
 *
 * `content` is the source of truth. Everything below it — blocks, excerpt,
 * word count — is derived server-side on every write and is not client
 * editable, so the two can't drift.
 */

/** Inline formatting inside a paragraph, heading or table cell. */
export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "del"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "link"; href: string; c: Inline[] }
  /** An image sitting mid-sentence. One that owns its paragraph becomes an image *block*. */
  | { t: "img"; url: string; alt: string }
  | { t: "br" };

export type HeadingDepth = 1 | 2 | 3 | 4 | 5 | 6;

export type TableAlign = "left" | "center" | "right" | null;

/** One item in an ordered or bulleted list. `checked` is non-null only for GFM task items. */
export interface ListItem {
  checked: boolean | null;
  c: Block[];
}

export type Block =
  /** `text` and `slug` are denormalised so a table of contents is a map, not a tree walk. */
  | { type: "heading"; depth: HeadingDepth; slug: string; text: string; c: Inline[] }
  | { type: "paragraph"; c: Inline[] }
  | { type: "code"; lang: string | null; value: string }
  | { type: "quote"; c: Block[] }
  | { type: "list"; ordered: boolean; start: number | null; items: ListItem[] }
  | { type: "table"; align: TableAlign[]; head: Inline[][]; rows: Inline[][][] }
  | { type: "image"; url: string; alt: string }
  | { type: "hr" }
  /**
   * Anything the flattener doesn't understand — footnotes, embedded HTML, MDX.
   * Kept as its original source and rendered visibly rather than dropped: a
   * note that silently loses a section is worse than one that shows a raw
   * block you can see and fix.
   */
  | { type: "raw"; value: string };

/**
 * A folder on the notes shelf. Nesting is arbitrary depth via `parentId`,
 * which is null at the root — a flat table walked into a tree at render time
 * (`lib/tree.ts`) rather than a materialised path, so moving a folder is one
 * write instead of rewriting every descendant.
 */
export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export type CategoryPatch = Partial<Pick<Category, "name" | "parentId">>;

export interface Note {
  id: string;
  title: string;
  /** The original markdown, frontmatter included. Re-parsable, re-exportable. */
  content: string;
  /** Derived from `content` server-side. Never sent by the client. */
  blocks: Block[];
  excerpt: string;
  wordCount: number;
  tags: string[];
  /** Optional link to a habit, for colour and context. May dangle if the habit is deleted. */
  habitId: string | null;
  /** The folder this note sits in. Null means the root, not "no category". */
  categoryId: string | null;
  /** Null when the note was typed rather than imported from a file. */
  sourceFilename: string | null;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The index list carries every note but not their bodies — 50 notes of
 * markdown is megabytes, and it would be fetched on every route. `content`
 * and `blocks` arrive from `GET /api/notes/[id]` when a note is opened.
 */
export type NoteMeta = Omit<Note, "content" | "blocks">;

/**
 * What a client may change. `blocks`, `excerpt` and `wordCount` are absent on
 * purpose — they are recomputed from `content` by the server.
 */
export type NotePatch = Partial<
  Pick<Note, "title" | "content" | "tags" | "habitId" | "categoryId" | "pinnedAt">
>;
