import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

function createDb(): BetterSQLite3Database<typeof schema> {
  const url = process.env.DATABASE_URL ?? "file:./data/dev.db";
  const file = url.startsWith("file:") ? url.slice(5) : url;
  const resolved = path.resolve(process.cwd(), file);

  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  const sqlite = new Database(resolved);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON"); // makes deleting a person clean up their links

  return drizzle(sqlite, { schema });
}

const globalForDb = globalThis as unknown as { db?: BetterSQLite3Database<typeof schema> };

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
