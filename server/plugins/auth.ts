import { createAuthPlugin } from "@agent-native/core/server";
import type { H3Event } from "h3";

import { resolveBrowserIdentity } from "../browser-identity";

/**
 * Hackathon demo: there is no login at all.
 *
 * Every request resolves to the browser that sent it, using the random id in
 * the `svg_motion_browser_id` cookie (minted on first visit). That id is the
 * owner key for projects, the agent scratchpad, and chat history — so each
 * browser gets its own private workspace without anyone signing in.
 *
 * `getSession` replaces the framework's Better Auth sign-in entirely (no
 * sign-in routes are mounted). `getBrowserSession` is the same resolver, but
 * the framework only calls it when a cookie is present, for browser-only
 * capabilities and approvals.
 *
 * The page paths are intentionally NOT public: the document request has to be
 * the one that mints the cookie, so the browser owns an id before any client
 * action runs.
 */
function browserSession(event: H3Event) {
  const { id, email } = resolveBrowserIdentity(event);

  return {
    email,
    userId: `browser-${id}`,
    name: "Guest",
    // There is no mailbox behind this id, so there is nothing to verify.
    // Marking it verified keeps "verify your email" prompts out of the UI.
    emailVerified: true,
  };
}

export default createAuthPlugin({
  getSession: async (event) => browserSession(event),
  getBrowserSession: async (event) => browserSession(event),
  publicPaths: ["/manifest.json"],
});
