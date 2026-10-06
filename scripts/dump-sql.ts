/**
 * Dumps the local dev database (schema + demo family) to turso-setup.sql,
 * so it can be pasted into the Turso web SQL console.
 */
import fs from "node:fs";
import { createClient } from "@libsql/client";

const client = createClient({ url: `file:${process.cwd()}/data/dev.db` });

function quote(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

const parts: string[] = [
  "-- Rooted: creates the tables and loads the demo family.",
  "-- Paste this whole file into the Turso dashboard SQL console and run it.",
  "",
];

async function main() {
const tables = await client.execute(
  "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' ORDER BY name"
);

for (const t of tables.rows) {
  const sql = String(t.sql).replace(/^CREATE TABLE /i, "CREATE TABLE IF NOT EXISTS ");
  parts.push(`${sql};`, "");
}

for (const name of ["people", "partnerships", "parent_edges"]) {
  const res = await client.execute(`SELECT * FROM ${name}`);
  if (res.rows.length === 0) continue;
  parts.push(`-- ${name}`);
  for (const row of res.rows) {
    const values = res.columns.map((c) => quote((row as Record<string, unknown>)[c]));
    parts.push(`INSERT INTO ${name} (${res.columns.join(", ")}) VALUES (${values.join(", ")});`);
  }
  parts.push("");
}

fs.writeFileSync("turso-setup.sql", parts.join("\n"));
console.log(`Wrote turso-setup.sql (${parts.length} lines).`);
client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
