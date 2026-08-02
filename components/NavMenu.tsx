"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { LogOut, Menu, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AUTH_LINKS, LINKS, isActiveHref } from "@/components/navLinks";
import { cn } from "@/lib/utils";

/**
 * Every destination on a phone, behind one button.
 *
 * The icon tabs plus the theme and sign-out controls came to more than 360px of
 * chrome on the 360px viewport this app is designed for, and each tab was a
 * ~34px target with no gap to its neighbour. Collapsing them trades a tap for a
 * row that spells itself out and clears the 44px minimum.
 *
 * Built on `DialogPrimitive` directly rather than `components/ui/dialog.tsx`:
 * that primitive is a centred modal, and giving it a `side` prop would change
 * the shape of every dialog in the app to serve one caller. `FocusTimer` sets
 * the same precedent for its immersive view. What comes with the primitive and
 * isn't hand-rolled here: focus trap, focus returned to the trigger on close,
 * Escape, body scroll lock, and `aria-expanded` on the trigger.
 */

/** One tappable line. `min-h-11` is the 44px touch floor the old tabs missed. */
const ROW =
  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors";

const QUIET = "text-ink-2 hover:bg-surface-2 hover:text-ink";

export function NavMenu({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger className="flex h-11 w-11 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-surface hover:text-ink sm:hidden">
        <Menu className="h-5 w-5 shrink-0" aria-hidden />
        <span className="sr-only">Menu</span>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-base/70 backdrop-blur-[3px] data-[state=open]:animate-scrim-in data-[state=closed]:animate-scrim-out" />

        {/* z-50 puts both the scrim and the sheet over the docked session bar
            (z-40), so a running timer dims with the rest of the page instead of
            punching a lit strip through the overlay. */}
        <DialogPrimitive.Content
          // No description to point at, and Radix warns when the id is missing
          // rather than deliberately absent.
          aria-describedby={undefined}
          // The sheet is full-height, so its last row would otherwise sit under
          // the iPhone home indicator and its header under the notch.
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
          className="fixed inset-y-0 right-0 z-50 flex w-[min(320px,85vw)] flex-col border-l border-line-2 bg-surface elev-lift data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <DialogPrimitive.Title className="px-1 font-display text-base text-ink">
              Menu
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink">
              <X className="h-4 w-4 shrink-0" aria-hidden />
              <span className="sr-only">Close menu</span>
            </DialogPrimitive.Close>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            {LINKS.map(({ href, label, Icon }) => {
              const active = isActiveHref(href, pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  // A `Link` doesn't unmount this component, so the sheet would
                  // stay open over the page it just navigated to. Closing here
                  // rather than from an effect on `pathname`: that would be a
                  // synchronous setState in an effect body, which the React
                  // purity rules in this repo reject.
                  onClick={() => setOpen(false)}
                  className={cn(
                    ROW,
                    "relative",
                    active ? "bg-surface-2 text-ink" : QUIET
                  )}
                >
                  {/* The rail carries "you are here" alongside the fill, so the
                      state doesn't rest on a surface step alone. */}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-amber"
                    />
                  )}
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Ruled off below the destinations: neither leaving nor changing the
              lights is somewhere you can go. */}
          <div className="flex flex-col gap-1 border-t border-line p-3">
            <ThemeToggle showLabel className={cn(ROW, QUIET)} />
            {signedIn ? (
              <button
                type="button"
                onClick={() => signOut({ redirectTo: "/login" })}
                className={cn(ROW, QUIET)}
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                Sign out
              </button>
            ) : (
              AUTH_LINKS.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(ROW, QUIET)}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </Link>
              ))
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
