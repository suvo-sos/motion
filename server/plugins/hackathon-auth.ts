import { defineNitroPlugin } from "@agent-native/core/server";

/**
 * Hackathon deployment: no accounts, no sessions.
 *
 * Auth is disabled unless someone explicitly sets `AUTH_DISABLED=false`.
 * `AUTH_DISABLED=true` means every request runs as the built-in
 * `dev@local.test` identity and no login/session row is created. The auth
 * tables and code stay in place because the framework expects them; this
 * switch only turns the behaviour off.
 */
export default defineNitroPlugin(() => {
  if (process.env.AUTH_DISABLED === undefined) {
    process.env.AUTH_DISABLED = "true";
  }
});
