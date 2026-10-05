import { createLibsqlClient } from "./index";
import { resolveDbConfig } from "./path";
import { seedDemoFamily } from "./seed";

try {
  process.loadEnvFile();
} catch {
  // no .env file — environment variables (or the local default) are used as-is
}

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS people (
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
   );`,
  `CREATE TABLE IF NOT EXISTS partnerships (
     id TEXT PRIMARY KEY,
     a_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
     b_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
     status TEXT,
     created_at INTEGER NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS parent_edges (
     id TEXT PRIMARY KEY,
     parent_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
     child_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
     adoption TEXT,
     created_at INTEGER NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS invites (
     id TEXT PRIMARY KEY,
     token TEXT NOT NULL UNIQUE,
     name TEXT NOT NULL,
     note TEXT,
     status TEXT NOT NULL DEFAULT 'pending',
     created_at INTEGER NOT NULL,
     submitted_at INTEGER
   );`,
  `CREATE TABLE IF NOT EXISTS submissions (
     id TEXT PRIMARY KEY,
     invite_id TEXT NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
     status TEXT NOT NULL DEFAULT 'submitted',
     items_json TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     decided_at INTEGER
   );`,
];

/**
 * One-time setup: creates the tables (if missing), applies small migrations,
 * and adds the demo family to an empty database. Safe to run repeatedly.
 * Works against a local SQLite file *and* a hosted Turso database.
 */
async function main() {
  const { url, isLocalFile } = resolveDbConfig();
  console.log(
    isLocalFile
      ? `Setting up local database at ${url.slice("file:".length)}`
      : `Setting up remote database at ${url.replace(/\?.*$/, "")}`
  );

  const client = createLibsqlClient();

  for (const sql of STATEMENTS) {
    await client.execute(sql);
  }

  // --- migrations for databases created by older versions ---
  const edgeCols = await client.execute("PRAGMA table_info('parent_edges')");
  if (!edgeCols.rows.some((c) => c.name === "adoption")) {
    await client.execute("ALTER TABLE parent_edges ADD COLUMN adoption TEXT;");
    console.log("Added 'adoption' column to parent_edges.");
  }

  console.log("Tables are ready.");

  const result = await client.execute("SELECT COUNT(*) AS count FROM people");
  const count = Number(result.rows[0].count ?? 0);

  if (count === 0) {
    const seeded = await seedDemoFamily();
    console.log(`Seeded ${seeded} demo people.`);
  } else {
    console.log(`Database already has ${count} people — left the data as-is.`);
  }

  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
