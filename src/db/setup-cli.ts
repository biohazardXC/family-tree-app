import { DatabaseSync } from "node:sqlite";
import { resolveDbFile } from "./path";
import { seedDemoFamily } from "./seed";

/**
 * One-time setup: creates the tables (if missing), applies small migrations,
 * and adds the demo family to an empty database. Safe to run repeatedly.
 */
async function main() {
  const sqlite = new DatabaseSync(resolveDbFile());
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT,
      maiden_name TEXT,
      gender TEXT,
      birth_date TEXT,
      birth_place TEXT,
      death_date TEXT,
      death_place TEXT,
      notes TEXT,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS partnerships (
      id TEXT PRIMARY KEY,
      a_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      b_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      status TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS parent_edges (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      child_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL
    );
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      submitted_at INTEGER
    );
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      invite_id TEXT NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'submitted',
      items_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      decided_at INTEGER
    );
  `);

  // --- migrations for databases created by older versions ---
  const edgeCols = sqlite.prepare("PRAGMA table_info('parent_edges')").all() as {
    name: string;
  }[];
  if (!edgeCols.some((c) => c.name === "adoption")) {
    sqlite.exec("ALTER TABLE parent_edges ADD COLUMN adoption TEXT;");
    console.log("Added 'adoption' column to parent_edges.");
  }

  console.log("Tables are ready.");

  const [{ count }] = sqlite
    .prepare("SELECT COUNT(*) AS count FROM people")
    .all() as { count: number }[];

  if (count === 0) {
    const seeded = await seedDemoFamily();
    console.log(`Seeded ${seeded} demo people.`);
  } else {
    console.log(`Database already has ${count} people — left the data as-is.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
