import { createAuthPlugin } from "@agent-native/core/server";

/**
 * Hackathon demo: the studio itself is public.
 *
 * Auth stays enabled in production (AUTH_DISABLED must stay off — the
 * framework flags it as a production configuration error), but these
 * page routes load without a session. Visitors can browse templates,
 * draw, animate and export from localStorage projects without signing in.
 *
 * Everything else — agent chat, actions, settings, /chat — still requires
 * a session. In particular /_agent-native/* is NOT listed here, so
 * anonymous visitors cannot call actions (save/delete/purge) or the agent.
 */
export default createAuthPlugin({
  publicPaths: ["/", "/home", "/motion", "/manifest.json"],
});
