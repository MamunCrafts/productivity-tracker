"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LINKS, isActiveHref, tabLabel } from "@/components/navLinks";
import { cn } from "@/lib/utils";

/**
 * Every destination, one tap away, at the bottom of every page on a phone.
 *
 * `NavMenu` already holds the same six links, and it stays — the drawer spells
 * each one out in full and is where the theme and sign-out controls live. What
 * it can't be is *fast*: reaching Notes from the Board is a tap to open, a read
 * down the list, a tap to go, with the sheet's animation between them. This bar
 * is the shortcut, so a destination costs one tap from anywhere. Two ways in to
 * the same six routes is the normal shape of a phone app; the drawer is the
 * index, this is the spine.
 *
 * Hidden from `sm` up, where the tab strip in `Nav` already does this job with
 * room to spare.
 */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Page shortcuts"
      // `--tabbar-h` (app/globals.css) is the same value the body pads by and
      // the docked session bar lifts by, so those three can't drift apart. The
      // padding is applied here and the height set on the row below it, so the
      // bar's surface reaches under the home indicator while its targets stay
      // above it.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-base/90 backdrop-blur-xl sm:hidden"
    >
      {/* Six equal columns rather than a scroller: a shortcut you have to swipe
          sideways to reach is not a shortcut, and six fits 360px at 60px each —
          above the 44px touch floor in the dimension that gets tapped. */}
      <ul className="grid h-14 grid-cols-6">
        {LINKS.map((link) => {
          const { href, label, Icon } = link;
          const active = isActiveHref(href, pathname);
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                // The full label is the accessible name even when the visible
                // one is abbreviated, so "Stats" still announces as "Analytics".
                aria-label={label}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 px-0.5 transition-colors",
                  active ? "text-ink" : "text-ink-3"
                )}
              >
                {/* Amber, and the only amber down here: which page you are on is
                    the one thing this bar says, and the accent means exactly
                    that kind of focus. It also carries the state alongside the
                    ink step, so "you are here" doesn't rest on a colour
                    difference of one tone. */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 top-0 h-[2px] rounded-full bg-amber"
                  />
                )}
                <Icon
                  className={cn("h-5 w-5 shrink-0", active && "text-amber")}
                  aria-hidden
                />
                {/* `aria-hidden` because the link already has its full name;
                    without it a screen reader reads the abbreviation after it. */}
                <span
                  aria-hidden
                  className="w-full truncate text-center text-[10px] leading-none"
                >
                  {tabLabel(link)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
