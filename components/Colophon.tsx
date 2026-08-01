/**
 * The page's end matter.
 *
 * A colophon is the note at the back of a book saying who set it and in what
 * type — which is the right closing gesture for an app themed as a reading
 * room, and more honest than a footer of links that duplicate the nav.
 *
 * The specimen is the one bold element: each face shown doing the job it
 * actually does in the app rather than an abstract "Aa". Everything around it
 * is deliberately quiet — no amber (that means focus and the primary action,
 * nowhere else), no motion, nothing pressable.
 *
 * Server component: `new Date()` here is fine, and would break the purity
 * rule the moment this needed "use client".
 */

/** Each face, set in itself, showing the work it does. */
const SPECIMEN = [
  { sample: "Deep Work", face: "Fraunces", role: "subject matter", className: "font-display" },
  { sample: "Start session", face: "Geist", role: "interface", className: "font-sans" },
  { sample: "04:32:10", face: "Geist Mono", role: "numerals", className: "font-mono tnum" },
];

export function Colophon() {
  return (
    <footer className="relative z-10 mt-auto">
      {/* Fades at both ends rather than ruling the full width: the page ends
          the way the lamp light does, not with a box edge. */}
      <div
        aria-hidden
        className="h-px bg-gradient-to-r from-transparent via-line-2 to-transparent"
      />

      <div className="mx-auto max-w-5xl px-6 pb-24 pt-12">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
          Colophon
        </h2>

        <p className="mt-4 max-w-md font-display text-lg leading-snug text-ink sm:text-xl">
          Productivity Tracker
          <span className="text-ink-2"> — a private log of focused hours.</span>
        </p>

        {/* Three columns on a desk, three rows on a phone: the same three
            pairings, shaped like a spec table where there's no width for
            columns. */}
        <ul className="mt-8 sm:grid sm:grid-cols-3 sm:gap-8">
          {SPECIMEN.map(({ sample, face, role, className }) => (
            <li
              key={face}
              className="flex items-baseline justify-between gap-4 border-t border-line py-3 sm:block sm:border-0 sm:py-0"
            >
              <span className={`text-xl text-ink sm:text-2xl ${className}`}>
                {sample}
              </span>
              <span className="shrink-0 text-right text-xs text-ink-2 sm:mt-2 sm:block sm:text-left">
                <span className="font-mono">{face}</span>
                <span className="text-ink-3"> · </span>
                {role}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <div>
            {/* "Set" as in typeset — the colophon's own verb, and the reason
                the specimen above sits where it does. */}
            <p className="font-display text-base text-ink">
              Set and built by Md Al Mamun Mim
            </p>
            <p className="mt-0.5 text-sm text-ink-2">
              Senior Software Developer, Fanfare
            </p>
          </div>
          <p className="font-mono text-xs text-ink-2 tnum">
            {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
