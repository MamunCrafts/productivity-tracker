export type Theme = "dark" | "light";

export const THEME_KEY = "pt.theme";

/** Same-tab notification; `storage` only fires in *other* tabs. */
export const THEME_EVENT = "pt:theme";

/**
 * Runs in `<head>`, before the first paint, so the correct palette is on the
 * document from the very first frame. Doing this in React instead would mean
 * one frame of the wrong theme on every load — a white flash on a dark theme is
 * exactly the glare this palette exists to avoid.
 *
 * Falls back to the OS preference when nothing has been chosen, and to dark if
 * storage throws — dark is what plain `:root` declares, so that stays coherent.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})();`;

/** The document is the single source of truth — the inline script sets it first. */
export function getTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode. The attribute is already set, so the choice holds for this
    // page at least; it just won't survive a reload.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function toggleTheme() {
  setTheme(getTheme() === "light" ? "dark" : "light");
}

/** For `useSyncExternalStore`. */
export function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  // Keeps tabs in step.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
