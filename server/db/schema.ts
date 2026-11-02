import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";

export const animations = pgTable("animations", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("Untitled animation"),
  svg: text("svg").notNull().default(""),
  tracks: text("tracks").notNull().default("[]"),
  duration: integer("duration").notNull().default(2000),
  loop: boolean("loop").notNull().default(true),
  pinned: boolean("pinned").notNull().default(false),
  ownerEmail: text("owner_email"),
  orgId: text("org_id"),
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});
