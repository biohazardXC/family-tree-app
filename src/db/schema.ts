import { randomUUID } from "node:crypto";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const people = sqliteTable("people", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  maidenName: text("maiden_name"),
  gender: text("gender"), // "male" | "female" | "other"
  birthDate: text("birth_date"), // free text on purpose: "1945", "abt. March 1948" are all valid
  birthPlace: text("birth_place"),
  deathDate: text("death_date"),
  deathPlace: text("death_place"),
  notes: text("notes"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// A couple: married, partners, divorced, engaged...
export const partnerships = sqliteTable("partnerships", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  aId: text("a_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  bId: text("b_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  status: text("status"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// A parent -> child link.
export const parentEdges = sqliteTable("parent_edges", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  parentId: text("parent_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  childId: text("child_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
