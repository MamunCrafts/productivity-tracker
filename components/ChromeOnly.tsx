"use client";

import { usePathname } from "next/navigation";
import { AUTH_ROUTES } from "@/auth.config";

/**
 * Hides the app shell — nav, docked timer, colophon — on the sign-in screens.
 *
 * A login form sitting under a nav that links to Habits and the Board reads as
 * a page you're already inside. Route groups would be the idiomatic fix, but
 * that means relocating every existing page directory; this keeps the change to
 * the one thing that actually differs.
 *
 * Route only, never session state: middleware already guarantees that anything
 * rendering this is signed in, and the route list is the same one the guard
 * uses, so the two can't drift.
 */
export function ChromeOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (AUTH_ROUTES.includes(pathname)) return null;
  return <>{children}</>;
}
