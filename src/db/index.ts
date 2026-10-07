import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { resolveDbConfig } from "./path";

export type Database = LibSQLDatabase<typeof schema>;

/**
 * One libSQL client for both worlds:
 *  - local dev  -> file:./data/dev.db  (plain SQLite file, same as before)
 *  - production -> libsql://… on Turso, authenticated with DATABASE_AUTH_TOKEN
 */
export function createLibsqlClient(): Client {
  const { url, authToken } = resolveDbConfig();
  return createClient({ url, authToken });
}

function createDb(): Database {
  return drizzle(createLibsqlClient(), { schema });
}

const globalForDb = globalThis as unknown as { db?: Database };

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
