import { DatabaseSync } from "node:sqlite";
import { drizzle, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";
import { resolveDbFile } from "./path";

export type Database = SqliteRemoteDatabase<typeof schema>;

/**
 * node:sqlite can't bind JS booleans or Dates directly —
 * translate them before they reach the database.
 */
function bindable(value: unknown): unknown {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.getTime();
  return value;
}

function createDb(): Database {
  const sqlite = new DatabaseSync(resolveDbFile());
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;"); // makes deleting a person clean up their links

  return drizzle(
    async (sql, params, method) => {
      const bound = params.map(bindable);
      const stmt = sqlite.prepare(sql);

      if (method === "run") {
        stmt.run(...bound);
        return { rows: [] };
      }
      if (method === "get") {
        // Drizzle expects the positional row array itself here.
        const row = stmt.get(...bound) as Record<string, unknown> | undefined;
        return { rows: row ? Object.values(row) : [] };
      }
      // "all" and "values": rows as positional arrays
      const rows = stmt.all(...bound) as Record<string, unknown>[];
      return { rows: rows.map((r) => Object.values(r)) };
    },
    { schema }
  );
}

const globalForDb = globalThis as unknown as { db?: Database };

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
