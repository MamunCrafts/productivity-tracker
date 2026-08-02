"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NavMenu } from "@/components/NavMenu";
import { Mark } from "@/components/Mark";
import { AUTH_LINKS, LINKS, isActiveHref } from "@/components/navLinks";
import { cn } from "@/lib/utils";

/**
 * From `sm` up this is the whole nav: wordmark, six tabs, and the controls
 * pushed right. Below it, everything but the wordmark collapses into
 * `NavMenu` — the tabs and two controls overran the 360px viewport, and each
 * tab sat under the 44px touch minimum.
 */
export function Nav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-30 border-b border-line bg-base/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-display text-base text-ink"
        >
          <Mark className="h-4 w-4 shrink-0 text-amber" />
          {/* The wordmark used to be the first thing cut on a phone, because
              the destinations mattered more than the name of the app you were
              in. With those behind the menu button there's room for it, and a
              bar holding nothing but a mark and a hamburger reads unfinished. */}
          <span>Productivity Tracker</span>
        </Link>

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
