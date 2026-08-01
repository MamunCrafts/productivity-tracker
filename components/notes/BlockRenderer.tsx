import type { Block, HeadingDepth } from "@/types/notes";
import { isRenderableImage } from "@/lib/noteView";
import { cn } from "@/lib/utils";
import { Inlines, MissingAsset } from "./InlineRenderer";

/**
 * `Block[]` → React. There is no prose stylesheet and no markdown parser in
 * this path: each element carries the theme tokens directly, which is the
 * whole reason the markdown was flattened to JSON at write time.
 */
export function NoteBody({ blocks }: { blocks: Block[] }) {
  if (blocks.length === 0) {
    return <p className="text-sm text-ink-3">This note is empty.</p>;
  }

  return (
    // ~68 characters is the comfortable measure for sustained reading; the
    // body is left-aligned in it rather than centred so the eye keeps one
    // return point down the page.
    <div className="max-w-[68ch] leading-[1.75] text-ink-2">
      {blocks.map((block, i) => (
        <BlockNode key={i} block={block} first={i === 0} />
      ))}
    </div>
  );
}

function BlockNode({ block, first }: { block: Block; first?: boolean }) {
  switch (block.type) {
    case "heading":
      return <Heading block={block} first={first} />;

    case "paragraph":
      return (
        <p className="mt-4 break-words first:mt-0">
          <Inlines nodes={block.c} />
        </p>
      );

    case "code":
      return (
        <figure className="mt-5 overflow-hidden rounded-lg border border-line bg-surface-2 first:mt-0">
          {block.lang && (
            <figcaption className="border-b border-line px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
              {block.lang}
            </figcaption>
          )}
          {/* Its own scroller: a long line must never widen the page. */}
          <pre className="overflow-x-auto px-4 py-3">
            <code className="font-mono text-[13px] leading-relaxed text-ink">
              {block.value}
            </code>
          </pre>
        </figure>
      );

    case "quote":
      return (
        <blockquote className="mt-5 border-l-2 border-line-2 pl-4 text-ink-2 first:mt-0 [&>*:first-child]:mt-0">
          {block.c.map((child, i) => (
            <BlockNode key={i} block={child} />
          ))}
        </blockquote>
      );

    case "list":
      return <List block={block} />;

    case "table":
      return <Table block={block} />;

    case "image":
      return (
        <figure className="mt-5 first:mt-0">
          {isRenderableImage(block.url) ? (
            // Arbitrary remote sources from an imported file; next/image
            // needs configured domains, which an unknown host can't satisfy.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.url}
              alt={block.alt}
              className="max-w-full rounded-lg border border-line"
            />
          ) : (
            <MissingAsset alt={block.alt} />
          )}
          {block.alt && (
            <figcaption className="mt-2 text-xs text-ink-3">{block.alt}</figcaption>
          )}
        </figure>
      );

    case "hr":
      return <hr className="mt-7 border-line" />;

    case "raw":
      // Deliberately visible. A block the flattener didn't understand is kept
      // as its source so nothing disappears from a note without a trace.
      return (
        <div className="mt-5 rounded-lg border border-dashed border-line-2 bg-surface-2/50 px-3 py-2 first:mt-0">
          <p className="mb-1 text-[11px] uppercase tracking-wider text-ink-3">
            Unrendered source
          </p>
          <pre className="overflow-x-auto font-mono text-[12px] leading-relaxed text-ink-2">
            {block.value}
          </pre>
        </div>
      );
  }
}

/** Fraunces carries subject matter, so headings inside a note get the display face. */
function Heading({
  block,
  first,
}: {
  block: Extract<Block, { type: "heading" }>;
  first?: boolean;
}) {
  const Tag = `h${block.depth}` as "h1";
  const size: Record<HeadingDepth, string> = {
    1: "text-2xl sm:text-3xl",
    2: "text-xl sm:text-2xl",
    3: "text-lg sm:text-xl",
    4: "text-base",
    5: "text-sm",
    6: "text-sm",
  };

  return (
    <Tag
      id={block.slug}
      className={cn(
        "font-display font-medium leading-snug text-ink",
        // Space above a heading, not below it: the gap belongs to the section
        // it opens. `scroll-mt` keeps it clear of the sticky nav on anchor jumps.
        first ? "mt-0" : "mt-8",
        "mb-2 scroll-mt-20",
        size[block.depth]
      )}
    >
      <Inlines nodes={block.c} />
    </Tag>
  );
}

function List({ block }: { block: Extract<Block, { type: "list" }> }) {
  const isTaskList = block.items.some((item) => item.checked !== null);
  const Tag = block.ordered ? "ol" : "ul";

  return (
    <Tag
      start={block.start ?? undefined}
      className={cn(
        "mt-4 space-y-1.5 first:mt-0",
        // Task lists carry their own checkbox glyph, so the bullet is dropped.
        isTaskList
          ? "list-none pl-0"
          : cn("pl-5", block.ordered ? "list-decimal" : "list-disc"),
        "marker:text-ink-3"
      )}
    >
      {block.items.map((item, i) => (
        <li
          key={i}
          className={cn(
            "[&>*:first-child]:mt-0",
            isTaskList && "flex items-start gap-2"
          )}
        >
          {item.checked !== null && (
            <span
              aria-hidden
              className={cn(
                "mt-[0.45em] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border text-[9px] leading-none",
                item.checked
                  ? "border-amber-deep bg-amber-deep/20 text-amber"
                  : "border-line-2"
              )}
            >
              {item.checked ? "✓" : ""}
            </span>
          )}
          <div className={cn(isTaskList && "min-w-0 flex-1")}>
            {item.checked !== null && (
              <span className="sr-only">
                {item.checked ? "Completed: " : "Not completed: "}
              </span>
            )}
            {item.c.map((child, j) => (
              <BlockNode key={j} block={child} />
            ))}
          </div>
        </li>
      ))}
    </Tag>
  );
}

function Table({ block }: { block: Extract<Block, { type: "table" }> }) {
  const align = (i: number) => {
    switch (block.align[i]) {
      case "center":
        return "text-center";
      case "right":
        return "text-right tnum";
      default:
        return "text-left";
    }
  };

  return (
    // Wide content gets its own scroller — the page body never scrolls sideways.
    <div className="mt-5 -mx-4 overflow-x-auto px-4 first:mt-0 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[24rem] border-collapse text-sm">
        {block.head.length > 0 && (
          <thead>
            <tr className="border-b border-line-2">
              {block.head.map((cell, i) => (
                <th
                  key={i}
                  scope="col"
                  className={cn(
                    "px-3 py-2 font-medium text-ink whitespace-nowrap",
                    align(i)
                  )}
                >
                  <Inlines nodes={cell} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {block.rows.map((row, i) => (
            <tr key={i} className="border-b border-line last:border-0">
              {row.map((cell, j) => (
                <td key={j} className={cn("px-3 py-2 align-top", align(j))}>
                  <Inlines nodes={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
