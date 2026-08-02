"use client";

import { Moon, Sun } from "lucide-react";
import { toggleTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Which glyph shows is decided in CSS, from the attribute on the document
 * element, not from React state — so it is already correct in the first painted
 * frame and can't flash the wrong icon before hydration. The button itself only
 * needs a click handler.
 *
 * Each icon is the theme you'd be switching *to*, which is the convention
 * everywhere this control appears.
 *
 * `showLabel` spells that out for the mobile nav drawer, where the control is a
 * row among named rows and a bare glyph would be the only unlabelled thing in
 * the sheet. The label pair is theme-scoped by the same CSS as the icons, so it
 * can't disagree with the glyph beside it or flash the wrong word on load.
 */
export function ThemeToggle({
  showLabel = false,
  className,
}: {
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "flex items-center rounded-md px-2.5 py-1.5 text-ink-2 transition-colors hover:bg-surface hover:text-ink sm:px-3",
        className
      )}
    >
      <Sun className="theme-dark-only h-3.5 w-3.5 shrink-0" aria-hidden />
      <Moon className="theme-light-only h-3.5 w-3.5 shrink-0" aria-hidden />
      {/* The accessible name follows the same rule, so it always describes what
          pressing this will do — visibly when there's room for it, and to a
          screen reader either way. */}
      <span className={cn("theme-dark-only", !showLabel && "sr-only")}>
        Switch to the light theme
      </span>
      <span className={cn("theme-light-only", !showLabel && "sr-only")}>
        Switch to the dark theme
      </span>
    </button>
  );
}
