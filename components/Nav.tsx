"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookText,
  KanbanSquare,
  ListChecks,
  NotebookPen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Analytics", Icon: BarChart3 },
  { href: "/habits", label: "Habits", Icon: ListChecks },
  { href: "/tasks", label: "Board", Icon: KanbanSquare },
  { href: "/notes", label: "Notes", Icon: BookText },
  { href: "/review", label: "Review", Icon: NotebookPen },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-30 border-b border-line bg-base/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-display text-base text-ink"
        >
          <Activity className="h-4 w-4 shrink-0 text-amber" />
          {/* The wordmark is the first thing to go on a phone — the three
              destinations matter more than the name of the app you're in. */}
          <span className="hidden sm:inline">Productivity Tracker</span>
          <span className="sr-only sm:hidden">Productivity Tracker</span>
        </Link>
        <div className="flex items-center gap-1">
          {LINKS.map(({ href, label, Icon }) => {
            // Notes has children (/notes/import, /notes/[id]); the tab has to
            // stay lit inside them, so only "/" matches exactly.
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors sm:gap-2 sm:px-3",
                  active
                    ? "bg-surface-2 text-ink"
                    : "text-ink-2 hover:bg-surface hover:text-ink"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {/* Four destinations don't fit a 360px phone. Only the one
                    you're on spells itself out; the rest ride on their icon
                    until there's room. */}
                <span className={cn(!active && "hidden sm:inline")}>{label}</span>
                {!active && <span className="sr-only sm:hidden">{label}</span>}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
