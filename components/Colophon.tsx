import { Mark } from "@/components/Mark";

/**
 * The page's end matter.
 *
 * Quiet product context at the end of the app. It gives the page a deliberate
 * close without duplicating navigation that already exists above and below.
 *
 * Server component: `new Date()` here is fine, and would break the purity
 * rule the moment this needed "use client".
 */

const FOOTER_DETAILS = [
  { label: "Mode", value: "Private" },
  { label: "Stack", value: "Next.js" },
  { label: "Focus", value: "Deep work" },
];

export function Colophon() {
  return (
    <footer className="relative z-10 mt-auto border-t border-line bg-surface/45">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 pb-[calc(5rem+var(--tabbar-h))] pt-8 sm:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] sm:gap-x-10 sm:px-6 sm:pb-24 sm:pt-12">
        <section aria-label="Product context" className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line-2 bg-base text-amber">
              <Mark className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-display text-base font-medium text-ink sm:text-lg">
                Productivity Tracker
              </h2>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                Personal focus system
              </p>
            </div>
          </div>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-2 sm:text-base">
            A private workspace for habits, routines, tasks, notes, and focused
            hours.
          </p>
        </section>

        <ul className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="App details">
          {FOOTER_DETAILS.map(({ label, value }) => (
            <li
              key={label}
              className="rounded-md border border-line bg-base/65 px-2.5 py-2 sm:px-3 sm:py-2.5"
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3 sm:text-[10px]">
                {label}
              </p>
              <p className="mt-1 truncate text-xs font-medium text-ink sm:text-sm">
                {value}
              </p>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-4 sm:col-span-2 sm:pt-5">
          <p className="text-xs text-ink-2 sm:text-sm">
            Built by{" "}
            <span className="font-medium text-ink">Md Al Mamun Mim</span>
            <span className="text-ink-3"> / </span>
            Senior Software Developer, Fanfare
          </p>
          <p className="font-mono text-[11px] text-ink-3 tnum sm:text-xs">
            {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
