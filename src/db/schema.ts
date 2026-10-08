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

// A parent -> child link. adoption is null for biological,
// or "adopted" | "step" | "foster" for how the child joined the family.
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
  adoption: text("adoption"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// A personal, no-password invite link. Admin creates it, sends it via
// WhatsApp/SMS, the invitee taps it and gets their simple form.
export const invites = sqliteTable("invites", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  token: text("token").notNull().unique(),
  name: text("name").notNull(), // who the invite is for
  note: text("note"), // where it was sent / any note
  status: text("status").notNull().default("pending"), // pending | opened | submitted
  // A group link can be used by many people and never closes itself.
  multiUse: integer("multi_use", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
});

// A completed invitee form, waiting for admin review.
export const submissions = sqliteTable("submissions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  inviteId: text("invite_id")
    .notNull()
    .references(() => invites.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("submitted"), // submitted | approved | rejected
  itemsJson: text("items_json").notNull(), // SubmissionItem[] as JSON
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
});

// An explicit "these two are siblings" link, used when no parents are known
// yet. Once a parent is recorded for either of them, the parent is applied to
// the whole sibling group and the tree shows them normally.
export const siblingEdges = sqliteTable("sibling_edges", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  aId: text("a_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  bId: text("b_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
