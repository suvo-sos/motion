import { and, eq, sql, type SQL } from "drizzle-orm";

import { animations } from "./db/schema";

/**
 * Hackathon tenancy: every row belongs to the browser that wrote it.
 *
 * There is no login, so the only owner key is the browser id the auth plugin
 * resolves into `ctx.userEmail`. Actions scope reads and writes by that key so
 * two browsers sharing one database never see each other's projects.
 */

export function ownerFromCtx(
  ctx: { userEmail?: string | null } | undefined,
): string | null {
  const email = ctx?.userEmail?.trim().toLowerCase();
  return email ? email : null;
}

/** Case-insensitive owner match, mirroring the framework's `LOWER(owner_email)`. */
export function ownedBy(ownerEmail: string | null): SQL | undefined {
  if (!ownerEmail) return undefined;
  return sql`LOWER(${animations.ownerEmail}) = ${ownerEmail}`;
}

/**
 * `id = ? AND owner = ?`, falling back to `id = ?` when the request has no
 * session (never the case for a browser request, but keeps scripts working).
 */
export function animationOwnedBy(
  id: string,
  ownerEmail: string | null,
): SQL {
  const owner = ownedBy(ownerEmail);
  return owner ? (and(eq(animations.id, id), owner) as SQL) : eq(animations.id, id);
}
