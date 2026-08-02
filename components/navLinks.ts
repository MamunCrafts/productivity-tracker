import {
  BarChart3,
  BookText,
  CalendarClock,
  KanbanSquare,
  ListChecks,
  LogIn,
  type LucideIcon,
  NotebookPen,
} from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  /** Only where the full label won't fit a sixth of a phone. See `LINKS`. */
  short?: string;
  Icon: LucideIcon;
};

/**
 * The destination table, shared by the three things that render it: the tab
 * strip in `Nav` from `sm` up, the drawer in `NavMenu` below it, and the bottom
 * tab bar in `MobileTabBar`. It lives here rather than in `Nav` so neither of
 * the other two has to import its own parent.
 *
 * `short` is the label when the destination has a sixth of a 360px viewport to
 * name itself in — the same trick the range filter on `/` plays with
 * `RANGES[].short`. Only the one entry that doesn't fit carries it; everything
 * else keeps a single name across all three surfaces, and `tabLabel` falls back
 * so a new destination doesn't have to think about it.
 */
export const LINKS: NavLink[] = [
  { href: "/", label: "Analytics", short: "Stats", Icon: BarChart3 },
  { href: "/habits", label: "Habits", Icon: ListChecks },
  // Sits next to Habits because it is the same subject in the other tense:
  // Habits is what you are working on, Routine is when.
  { href: "/routine", label: "Routine", Icon: CalendarClock },
  { href: "/tasks", label: "Board", Icon: KanbanSquare },
  { href: "/notes", label: "Notes", Icon: BookText },
  { href: "/review", label: "Review", Icon: NotebookPen },
];

/**
 * Signed out, the auth destination takes the place of the sign-out control.
 * It stays available so any future public page still has a working way in.
 */
export const AUTH_LINKS = [
  { href: "/login", label: "Login", Icon: LogIn },
];

/**
 * Notes has children (`/notes/import`, `/notes/[id]`) and the entry has to stay
 * lit inside them, so matching is by prefix — which makes "/" a prefix of
 * everything, hence the one exact case.
 */
export function isActiveHref(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * The name a destination goes by when it only has a tab's width. The full label
 * stays the accessible name everywhere, so what a screen reader announces never
 * depends on how much room the glyph had.
 */
export function tabLabel(link: NavLink) {
  return link.short ?? link.label;
}
