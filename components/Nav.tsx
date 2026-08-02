"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NavMenu } from "@/components/NavMenu";
import { NavClock } from "@/components/NavClock";
import { Mark } from "@/components/Mark";
import { AUTH_LINKS, LINKS, isActiveHref } from "@/components/navLinks";
import { cn } from "@/lib/utils";

/**
 * From `sm` up this is the whole nav: mark, clock, six tabs, and the controls
 * pushed right. Below it, everything but the mark and the clock collapses into
 * `NavMenu` — the tabs and two controls overran the 360px viewport, and each
 * tab sat under the 44px touch minimum.
 *
 * The wordmark is gone from here. It was the least useful thing in the bar, and
 * the time and date it made room for are the one piece of context every page
 * wants and none of them own. The mark still carries the identity and still
 * links home.
 */
export function Nav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-30 border-b border-line bg-base/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
        {/* The wordmark is the link home; the clock beside it is not part of it
            — "go to analytics" is not what a tap on a date means. */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-display text-sm text-ink transition-colors hover:text-amber"
          >
            <Mark className="h-4 w-4 shrink-0 text-amber" />
            {/* Compacted rather than dropped, because the clock now shares this
                end of the bar. "Tracker" below `sm` is the half of the name
                that isn't a category — and the full name is one breakpoint
                away, not gone. The accessible name never shortens. */}
            <span aria-hidden className="sm:hidden">
              Tracker
            </span>
            <span aria-hidden className="hidden sm:inline">
              Productivity Tracker
            </span>
            <span className="sr-only">Productivity Tracker — analytics</span>
          </Link>

          <span aria-hidden className="h-3.5 w-px shrink-0 bg-line-2" />

          <NavClock />
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          {LINKS.map(({ href, label, Icon }) => {
            const active = isActiveHref(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-surface-2 text-ink"
                    : "text-ink-2 hover:bg-surface hover:text-ink"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Pushed right, away from the destinations: leaving isn't one of
            them. */}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <div className="hidden items-center gap-1 sm:flex">
            <ThemeToggle />
            {signedIn ? (
              <button
                type="button"
                onClick={() => signOut({ redirectTo: "/login" })}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface hover:text-ink"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Sign out
              </button>
            ) : (
              AUTH_LINKS.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface hover:text-ink"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {label}
                </Link>
              ))
            )}
          </div>

          <NavMenu signedIn={signedIn} />
        </div>
      </div>
    </nav>
  );
}
