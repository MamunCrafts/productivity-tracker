import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

/**
 * The guard, in one place. `authConfig.callbacks.authorized` decides; a
 * signed-out request never reaches a page or an API handler, so the routes
 * don't each repeat the check.
 *
 * Only `auth.config.ts` is imported here — `auth.ts` pulls in mongoose and
 * bcrypt, and the request proxy should stay separate from sign-in internals.
 */
export const proxy = NextAuth(authConfig).auth;

export const config = {
  matcher: [
    /**
     * Everything except:
     *  - `api/auth` — Auth.js's own endpoints plus `/api/auth/register`, all of
     *    which must work while signed out or there is no way to get in.
     *  - static assets and the icon, which cost a proxy invocation each
     *    for nothing.
     */
    "/((?!api/auth|_next/static|_next/image|icon\\.svg|favicon\\.ico).*)",
  ],
};
