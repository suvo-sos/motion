import { randomUUID } from "node:crypto";
import { getCookie, getHeader, setCookie, type H3Event } from "h3";

/**
 * Hackathon identity: no login, no sign-up, no email.
 *
 * Every browser gets a random id on its first request, stored in a long-lived
 * cookie. That id is the only owner key the app has, so the studio, the
 * project mirror, the agent's scratchpad, and the chat history all belong to
 * the browser that created them.
 *
 * The framework keys ownership on an `owner_email` column, so the id is
 * wrapped in an email-shaped string (`guest-<uuid>@motion.local`). Nothing is
 * ever sent to that address — it is just the key.
 */

export const BROWSER_ID_COOKIE = "svg_motion_browser_id";

/** Two years. Long enough that a hackathon demo never loses its data. */
const BROWSER_ID_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2;

const BROWSER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface BrowserIdentity {
  id: string;
  email: string;
}

function isSecureRequest(event: H3Event): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    getHeader(event, "x-forwarded-proto") === "https"
  );
}

/**
 * Read the browser id from the cookie, or mint one and set the cookie on this
 * response. Safe to call from any request handler: the first call on a
 * cookie-less request is the one that assigns the id.
 */
export function resolveBrowserIdentity(event: H3Event): BrowserIdentity {
  const existing = getCookie(event, BROWSER_ID_COOKIE);
  const id =
    existing && BROWSER_ID_PATTERN.test(existing) ? existing : randomUUID();

  if (id !== existing) {
    setCookie(event, BROWSER_ID_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: BROWSER_ID_MAX_AGE_SECONDS,
      secure: isSecureRequest(event),
    });
  }

  return { id, email: `guest-${id}@motion.local` };
}
