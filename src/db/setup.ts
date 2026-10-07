import { createLibsqlClient } from "./index";
import { seedDemoFamily } from "./seed";

export const SCHEMA_STATEMENTS = [
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
  `CREATE TABLE IF NOT EXISTS sibling_edges (
     id TEXT PRIMARY KEY,
     a_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
     b_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
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

export type SetupResult = {
  created: boolean;
  seeded: number;
  people: number;
  messages: string[];
};

/**
 * Creates the tables (if missing), applies small migrations, and adds the demo
 * family to an empty database. Safe to run repeatedly, and works against both a
 * local SQLite file and a hosted Turso database.
 */
export async function runSetup(): Promise<SetupResult> {
  const client = createLibsqlClient();
  const messages: string[] = [];

  try {
    for (const sql of SCHEMA_STATEMENTS) {
      await client.execute(sql);
    }
    messages.push("Tables are ready.");

    // --- migrations for databases created by older versions ---
    const edgeCols = await client.execute("PRAGMA table_info('parent_edges')");
    if (!edgeCols.rows.some((c) => c.name === "adoption")) {
      await client.execute("ALTER TABLE parent_edges ADD COLUMN adoption TEXT;");
      messages.push("Added 'adoption' column to parent_edges.");
    }

    const result = await client.execute("SELECT COUNT(*) AS count FROM people");
    const existing = Number(result.rows[0].count ?? 0);

    let seeded = 0;
    if (existing === 0) {
      seeded = await seedDemoFamily();
      messages.push(`Seeded ${seeded} demo people.`);
    } else {
      messages.push(`Database already has ${existing} people — left the data as-is.`);
    }

    return { created: true, seeded, people: existing + seeded, messages };
  } finally {
    client.close();
  }
}
