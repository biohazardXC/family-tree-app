import fs from "node:fs";
import path from "node:path";

/** Resolves the DATABASE_URL setting to an absolute path of the SQLite file. */
export function resolveDbFile(): string {
  const url = process.env.DATABASE_URL ?? "file:./data/dev.db";
  const file = url.startsWith("file:") ? url.slice(5) : url;
  const resolved = path.resolve(process.cwd(), file);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
}
