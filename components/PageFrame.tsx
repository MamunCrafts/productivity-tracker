import { cn } from "@/lib/utils";

/**
 * The frame every top-level route opens with: the measure it is set in, and
 * the title block at the top of it.
 *
 * It exists because all six routes had the same header hand-written — a
 * stacked flex column below `sm`, a row from there up — and the phone half of
 * that was wrong in the same way six times. Any rule about how a page opens
 * (its gutters, its run-up, where the primary action sits at 360px) is one
 * edit here rather than six that drift.
 */

/** The measures in use. Literal classes, so the JIT can see them. */
const WIDTH = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
} as const;

export function PageShell({
  width,
  className,
  children,
}: {
  width: keyof typeof WIDTH;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        // Narrower gutters and a much shorter run-up on a phone. At `px-6
        // pt-14` the first row of real content started below the fold on a
        // 360×640 screen, so every page opened on its own title.
        "mx-auto px-4 pb-28 pt-8 sm:px-6 sm:pt-14",
        WIDTH[width],
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  lead,
  eyebrow,
  action,
  className,
}: {
  title: React.ReactNode;
  /** The sentence under the title. */
  lead?: React.ReactNode;
  /** Anything above the title — a back link, a breadcrumb. */
  eyebrow?: React.ReactNode;
  /** The page's primary control, if it has one. */
  action?: React.ReactNode;
  /** Bottom margin, mostly — the gap to the first section differs by page. */
  className?: string;
}) {
  return (
    /*
      Two columns that reflow rather than restack.

      On a phone the action sits beside the title and the lead runs full width
      beneath both; from `sm` the title and lead stack into column one and the
      action spans both rows, bottom-aligned — the desk layout unchanged. The
      flex column this replaces had to stretch the action to the full width of
      the screen to fill its row, and a 100%-wide amber bar two lines into the
      page shouts louder than anything it introduces.

      `items-center` centres the title against the taller button on the shared
      first row; `sm:items-end` is what puts the action on the lead's baseline
      on the desk.
    */
    <header
      className={cn(
        "grid items-center gap-x-3 gap-y-2 sm:items-end sm:gap-x-6",
        // No action means no second column — an empty `auto` track still costs
        // its gap, which would leave the title short of the measure.
        action ? "grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-1",
        "mb-8 sm:mb-10",
        className
      )}
    >
      {/* The eyebrow shares the title's cell rather than taking a row of its
          own, so the grid stays two rows whether or not a page has one. */}
      <div className="col-start-1 row-start-1 min-w-0">
        {eyebrow}
        <h1
          className={cn(
            "font-display text-3xl font-medium leading-tight text-ink sm:text-4xl",
            eyebrow && "mt-3"
          )}
        >
          {title}
        </h1>
      </div>

      {lead && (
        // Supporting text, so it drops a step on the phone rather than sitting
        // at the same size as the body of every card below it.
        <div
          className={cn(
            "col-start-1 row-start-2 text-sm text-ink-2 sm:text-base",
            action && "col-span-2 sm:col-span-1"
          )}
        >
          {lead}
        </div>
      )}

      {action && (
        <div
          className={cn(
            "col-start-2 row-start-1",
            // Only span down to a row that exists — otherwise the grid grows an
            // empty second row and its gap under the header.
            lead && "sm:row-span-2 sm:self-end"
          )}
        >
          {action}
        </div>
      )}
    </header>
  );
}
