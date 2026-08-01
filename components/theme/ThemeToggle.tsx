"use client";

import { Moon, Sun } from "lucide-react";
import { toggleTheme } from "@/lib/theme";

/**
 * Which glyph shows is decided in CSS, from the attribute on the document
 * element, not from React state — so it is already correct in the first painted
 * frame and can't flash the wrong icon before hydration. The button itself only
 * needs a click handler.
 *
 * Each icon is the theme you'd be switching *to*, which is the convention
 * everywhere this control appears.
 */
export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center rounded-md px-2.5 py-1.5 text-ink-2 transition-colors hover:bg-surface hover:text-ink sm:px-3"
    >
      <Sun className="theme-dark-only h-3.5 w-3.5 shrink-0" aria-hidden />
      <Moon className="theme-light-only h-3.5 w-3.5 shrink-0" aria-hidden />
      {/* The accessible name follows the same rule, so it always describes what
          pressing this will do. */}
      <span className="theme-dark-only sr-only">Switch to the light theme</span>
      <span className="theme-light-only sr-only">Switch to the dark theme</span>
    </button>
  );
}
