"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The tag row on the shelf.
 *
 * It used to be a sideways scroller — every tag in one line, running off the
 * edge of the phone. Three things were wrong with that. The tags past the fold
 * were invisible, so the vocabulary looked like whatever four words happened to
 * fit; the selected one could scroll out of sight, so an active filter left no
 * trace on screen; and nothing said how many notes were behind a word, so
 * picking one was a guess. It also broke the rule the rest of the app follows,
 * that a control you have to scroll sideways to reach is a worse answer than
 * showing fewer things.
 *
 * So: wrapped, not scrolled. Counted, so the row says what it's worth. Cut at
 * `HEAD` with the rest one tap away, because two lines of tags is a filter and
 * nine lines is a wall in front of the notes. The selected tag is always in the
 * visible set — a filter you can't see is a filter you can't undo.
 */

/** How many tags show before the row folds. Two lines at 360px. */
const HEAD = 6;

const PILL =
  "flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors sm:min-h-0 sm:py-1";

export function TagFilter({
  tags,
  value,
  onChange,
}: {
  /** Commonest first — see `tagCounts`. */
  tags: { tag: string; count: number }[];
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (tags.length === 0) return null;

  const head = tags.slice(0, HEAD);
  const rest = tags.slice(HEAD);
  // A tag selected before a folder change can fall outside the head, or out of
  // the list altogether. Either way it stays on screen so it can be cleared.
  const stray =
    value && !head.some((t) => t.tag === value) && !expanded
      ? (rest.find((t) => t.tag === value) ?? { tag: value, count: 0 })
      : null;

  const shown = expanded ? tags : stray ? [stray, ...head.slice(0, HEAD - 1)] : head;
  const hidden = tags.length - shown.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-[11px] uppercase tracking-[0.14em] text-ink-3">
        Tags
      </span>

      {shown.map(({ tag, count }) => {
        const selected = value === tag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onChange(selected ? null : tag)}
            aria-pressed={selected}
            aria-label={
              selected
                ? `Clear the ${tag} filter`
                : `Show only notes tagged ${tag} — ${count} ${count === 1 ? "note" : "notes"}`
            }
            className={cn(
              PILL,
              selected
                ? "border-line-2 bg-surface-2 text-ink"
                : "border-line text-ink-2 hover:border-line-2 hover:text-ink"
            )}
          >
            <span>{tag}</span>
            {/* The count is why the row is worth its space; on the selected
                pill it gives way to the thing you now need, which is out. */}
            {selected ? (
              <X className="h-3 w-3 shrink-0 text-ink-3" aria-hidden />
            ) : (
              <span aria-hidden className="font-mono text-[10px] tnum text-ink-3">
                {count}
              </span>
            )}
          </button>
        );
      })}

      {(hidden > 0 || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className={cn(PILL, "border-dashed border-line text-ink-3 hover:text-ink-2")}
        >
          {expanded ? "Show fewer" : `+${hidden} more`}
        </button>
      )}
    </div>
  );
}
