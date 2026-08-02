import type { NextAuthConfig } from "next-auth";

/** Reachable while signed out, or there is no way in. */
export const AUTH_ROUTES = ["/login", "/register"];

/**
 * The half of the Auth.js config that the request proxy can run.
 *
 * `proxy.ts` imports this file and nothing else, keeping the route guard
 * separate from the database-backed credentials provider in `auth.ts`.
 * Splitting them is the documented Auth.js pattern, not a workaround.
 */
export const authConfig = {
  pages: { signIn: "/login" },

  /**
   * A signed JWT in a cookie rather than a database session. Every Auth.js
   * database adapter brings its own collections and its own id shape, which
   * would sit awkwardly beside the application-level `id` convention every
   * model here uses. A cookie needs no adapter at all.
   */
  session: { strategy: "jwt" },

  // Filled in `auth.ts`. Must stay empty here so this file is Edge-safe.
  providers: [],

  callbacks: {
    /**
     * The whole route guard. Runs in proxy, so a signed-out request is
     * turned away before any handler executes and before any markup is sent —
     * including for `/api/*`, which is why the API routes themselves don't
     * each repeat the check.
     */
    authorized({ auth, request: { nextUrl } }) {
      const signedIn = Boolean(auth?.user);

      if (AUTH_ROUTES.includes(nextUrl.pathname)) {
        // No point showing the door to someone already inside.
        return signedIn ? Response.redirect(new URL("/", nextUrl)) : true;
      }

      // false sends them to `pages.signIn` with a callbackUrl attached.
      return signedIn;
    },
  },
} satisfies NextAuthConfig;
