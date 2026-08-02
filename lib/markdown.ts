import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type {
  Root,
  RootContent,
  PhrasingContent,
  Node as MdastNode,
} from "mdast";
import type {
  Block,
  HeadingDepth,
  Inline,
  ListItem,
  TableAlign,
} from "@/types/notes";

/**
 * Markdown → JSON, once, at write time.
 *
 * The reader never sees markdown: it renders `Block[]`, which means the
 * parser doesn't ship in the read path and every element's styling is ours
 * rather than a prose stylesheet's. This module is isomorphic — it touches
 * neither the DOM nor Node — so the import preview can run it in the browser
 * on exactly the same input the API route will.
 */

const processor = unified().use(remarkParse).use(remarkGfm);

/* ------------------------------------------------------------------ *
 * Frontmatter
 * ------------------------------------------------------------------ */

export interface Frontmatter {
  title?: string;
  tags?: string[];
}

/**
 * Hand-rolled rather than pulling in a YAML parser: the only keys that mean
 * anything here are `title` and `tags`, and `remark-frontmatter` would only
 * identify the block without parsing it anyway.
 *
 * Handles `key: value`, inline `tags: [a, b]`, and the dashed list form.
 */
export function splitFrontmatter(raw: string): {
  front: Frontmatter;
  body: string;
} {
  const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(raw);
  if (!match) return { front: {}, body: raw };

  const front: Frontmatter = {};
  let currentListKey: string | null = null;

  for (const line of match[1].split(/\r?\n/)) {
    const item = /^[ \t]*-[ \t]+(.*)$/.exec(line);
    if (item && currentListKey === "tags") {
      (front.tags ??= []).push(unquote(item[1]));
      continue;
    }

    const pair = /^([A-Za-z_][\w-]*)[ \t]*:[ \t]*(.*)$/.exec(line);
    if (!pair) continue;

    const [, key, rest] = pair;
    const value = rest.trim();
    currentListKey = value === "" ? key.toLowerCase() : null;

    if (key.toLowerCase() === "title" && value) front.title = unquote(value);
    if (key.toLowerCase() === "tags" && value) front.tags = parseTagList(value);
  }

  return { front, body: raw.slice(match[0].length) };
}

function unquote(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "").trim();
}

function parseTagList(value: string): string[] {
  return value
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map(unquote)
    .filter(Boolean);
}

/* ------------------------------------------------------------------ *
 * Slugs
 * ------------------------------------------------------------------ */

/**
 * `\p{M}` is load-bearing, not decoration.
 *
 * Combining marks are their own Unicode category — they are not `\p{L}`. In
 * Bengali (and Devanagari, Thai, Arabic, Vietnamese…) the vowel signs *are*
 * marks, so keeping only letters and numbers shreds a word into its bare
 * consonants: `কী এবং কীভাবে` became `ক-এব-ক-ভ-ব`. That broke anchors twice
 * over — the id was mangled, and it no longer matched the `#heading` hrefs in
 * a file's own table of contents, which every generator writes GitHub-style
 * (marks kept). With marks retained this agrees with github-slugger on every
 * heading tested, so an imported TOC resolves.
 *
 * It also cost uniqueness: distinct headings could collapse to the same
 * stripped form and quietly collide into `-1` suffixes.
 */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

/* ------------------------------------------------------------------ *
 * mdast → Block[]
 * ------------------------------------------------------------------ */

/** The original source behind a node, for anything we can't model. */
function sourceOf(node: MdastNode, src: string): string {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start === undefined || end === undefined) return "";
  return src.slice(start, end);
}

function toInlines(nodes: PhrasingContent[], src: string): Inline[] {
  const out: Inline[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "text":
        out.push({ t: "text", v: node.value });
        break;
      case "strong":
        out.push({ t: "strong", c: toInlines(node.children, src) });
        break;
      case "emphasis":
        out.push({ t: "em", c: toInlines(node.children, src) });
        break;
      case "delete":
        out.push({ t: "del", c: toInlines(node.children, src) });
        break;
      case "inlineCode":
        out.push({ t: "code", v: node.value });
        break;
      case "link":
        out.push({ t: "link", href: node.url, c: toInlines(node.children, src) });
        break;
      case "image":
        out.push({ t: "img", url: node.url, alt: node.alt ?? "" });
        break;
      case "break":
        out.push({ t: "br" });
        break;
      default:
        // Reference links, footnote markers, inline HTML. Their source is kept
        // as literal text — React escapes it, so it shows rather than vanishes.
        out.push({ t: "text", v: sourceOf(node, src) });
    }
  }

  return out;
}

/** A paragraph whose entire content is one image is really a figure. */
function loneImage(nodes: PhrasingContent[]) {
  const meaningful = nodes.filter(
    (n) => !(n.type === "text" && n.value.trim() === "")
  );
  return meaningful.length === 1 && meaningful[0].type === "image"
    ? meaningful[0]
    : null;
}

function toBlocks(
  nodes: RootContent[],
  src: string,
  seenSlugs: Map<string, number>
): Block[] {
  const out: Block[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "paragraph": {
        const image = loneImage(node.children);
        if (image) {
          out.push({ type: "image", url: image.url, alt: image.alt ?? "" });
        } else {
          out.push({ type: "paragraph", c: toInlines(node.children, src) });
        }
        break;
      }

      case "heading": {
        const c = toInlines(node.children, src);
        const text = inlineText(c);
        out.push({
          type: "heading",
          depth: node.depth as HeadingDepth,
          slug: uniqueSlug(text, seenSlugs),
          text,
          c,
        });
        break;
      }

      case "code":
        out.push({ type: "code", lang: node.lang ?? null, value: node.value });
        break;

      case "blockquote":
        out.push({ type: "quote", c: toBlocks(node.children, src, seenSlugs) });
        break;

      case "list": {
        const items: ListItem[] = node.children.map((item) => ({
          checked: item.checked ?? null,
          c: toBlocks(item.children, src, seenSlugs),
        }));
        out.push({
          type: "list",
          ordered: Boolean(node.ordered),
          start: node.start ?? null,
          items,
        });
        break;
      }

      case "table": {
        const [headRow, ...bodyRows] = node.children;
        out.push({
          type: "table",
          align: (node.align ?? []) as TableAlign[],
          head: headRow
            ? headRow.children.map((cell) => toInlines(cell.children, src))
            : [],
          rows: bodyRows.map((row) =>
            row.children.map((cell) => toInlines(cell.children, src))
          ),
        });
        break;
      }

      case "thematicBreak":
        out.push({ type: "hr" });
        break;

      case "definition":
        // Link definitions render nothing in markdown either — skipping one
        // loses no content, unlike every other default below.
        break;

      default:
        out.push({ type: "raw", value: sourceOf(node, src) });
    }
  }

  return out;
}

function uniqueSlug(text: string, seen: Map<string, number>): string {
  const base = slugify(text);
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

/* ------------------------------------------------------------------ *
 * Plain text, for excerpts, counts and (later) search
 * ------------------------------------------------------------------ */

function inlineText(inlines: Inline[]): string {
  return inlines
    .map((i) => {
      switch (i.t) {
        case "text":
        case "code":
          return i.v;
        case "strong":
        case "em":
        case "del":
        case "link":
          return inlineText(i.c);
        case "img":
          return i.alt;
        case "br":
          return " ";
      }
    })
    .join("");
}

export function plainText(blocks: Block[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "heading":
      case "paragraph":
        parts.push(inlineText(block.c));
        break;
      case "code":
        parts.push(block.value);
        break;
      case "quote":
        parts.push(plainText(block.c));
        break;
      case "list":
        parts.push(block.items.map((i) => plainText(i.c)).join(" "));
        break;
      case "table":
        parts.push(
          [block.head, ...block.rows]
            .map((row) => row.map(inlineText).join(" "))
            .join(" ")
        );
        break;
      case "image":
        parts.push(block.alt);
        break;
      case "raw":
        parts.push(block.value);
        break;
      case "hr":
        break;
    }
  }

  return parts.filter(Boolean).join("\n\n");
}

/**
 * Prose only — code and tables make for a misleading card preview. Source
 * line wrapping is collapsed, or the card shows the author's hard breaks.
 */
function excerptText(blocks: Block[]): string {
  for (const block of blocks) {
    if (block.type === "paragraph") {
      const text = collapse(inlineText(block.c));
      if (text) return text;
    }
  }
  return collapse(plainText(blocks));
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------------------ *
 * The one entry point
 * ------------------------------------------------------------------ */

export interface ParsedNote {
  title: string;
  tags: string[];
  blocks: Block[];
  excerpt: string;
  wordCount: number;
}

/**
 * Everything derivable from a markdown string. The API route calls this on
 * write and stores the result; the import screen calls it to preview. Same
 * input, same output — the preview is the real thing, not an approximation.
 */
export function parseNote(raw: string, filename?: string | null): ParsedNote {
  const { front, body } = splitFrontmatter(raw);
  const tree = processor.parse(body) as Root;
  const blocks = toBlocks(tree.children, body, new Map());

  const text = plainText(blocks);
  const excerpt = excerptText(blocks);

  return {
    title: front.title || firstHeading(blocks) || stripExtension(filename) || "Untitled note",
    tags: front.tags ?? [],
    blocks,
    excerpt: excerpt.length > 200 ? `${excerpt.slice(0, 199).trimEnd()}…` : excerpt,
    wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
  };
}

function firstHeading(blocks: Block[]): string {
  const heading = blocks.find((b) => b.type === "heading");
  return heading && heading.type === "heading" ? heading.text.trim() : "";
}

export function stripExtension(filename?: string | null): string {
  if (!filename) return "";
  return filename.replace(/\.(md|markdown|mdown|mkd|txt)$/i, "").trim();
}
