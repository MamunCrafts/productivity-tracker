import { cn } from "@/lib/utils";

/**
 * A note's own tags, shown rather than offered.
 *
 * Deliberately not the same object as the pills in `TagFilter`: those are
 * controls that change what the page lists, these are a property of the note
 * you're looking at. They read quieter — no border, no hover, no count — so a
 * card doesn't present six things that look pressable and aren't.
 *
 * Capped, because a note carrying a dozen tags would otherwise push its own
 * title off the top of a phone card. The reader has the room and passes no
 * cap.
 */
export function TagList({
  tags,
  max,
  className,
}: {
  tags: string[];
  /** Omit to show them all. */
  max?: number;
  className?: string;
}) {
  if (tags.length === 0) return null;

  const shown = max ? tags.slice(0, max) : tags;
  const hidden = tags.length - shown.length;

  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {shown.map((tag) => (
        <li
          key={tag}
          className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-2"
        >
          {tag}
        </li>
      ))}
      {hidden > 0 && (
        // Not "+3" alone: a bare number next to words reads as one more tag.
        <li className="text-[11px] tnum text-ink-3">+{hidden} more</li>
      )}
    </ul>
  );
}
