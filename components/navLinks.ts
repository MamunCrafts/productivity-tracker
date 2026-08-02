import {
  BarChart3,
  BookText,
  CalendarClock,
  KanbanSquare,
  ListChecks,
  LogIn,
  NotebookPen,
  UserPlus,
} from "lucide-react";

/**
 * The destination table, shared by the two things that render it: the tab strip
 * in `Nav` from `sm` up, and the drawer in `NavMenu` below it. It lives here
 * rather than in `Nav` so the drawer doesn't have to import its own parent.
 */
export const LINKS = [
  { href: "/", label: "Analytics", Icon: BarChart3 },
  { href: "/habits", label: "Habits", Icon: ListChecks },
  // Sits next to Habits because it is the same subject in the other tense:
  // Habits is what you are working on, Routine is when.
  { href: "/routine", label: "Routine", Icon: CalendarClock },
  { href: "/tasks", label: "Board", Icon: KanbanSquare },
  { href: "/notes", label: "Notes", Icon: BookText },
  { href: "/review", label: "Review", Icon: NotebookPen },
];

/**
 * Signed out, the two auth destinations take the place of the sign-out control.
 * They're kept rather than dropped so that exempting a route from the middleware
 * matcher later — a public landing page, say — leaves a working way in; as
 * things stand middleware means a signed-out visitor never reaches a page that
 * renders either nav.
 */
export const AUTH_LINKS = [
  { href: "/login", label: "Login", Icon: LogIn },
  { href: "/register", label: "Register", Icon: UserPlus },
];

/**
 * Notes has children (`/notes/import`, `/notes/[id]`) and the entry has to stay
 * lit inside them, so matching is by prefix — which makes "/" a prefix of
 * everything, hence the one exact case.
 */
export function isActiveHref(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
