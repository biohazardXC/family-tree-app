import fs from "node:fs";
import path from "node:path";

export type DbConfig = {
  url: string;
  authToken?: string;
  /** true when we're talking to a local SQLite file rather than hosted Turso */
  isLocalFile: boolean;
};

const DEFAULT_LOCAL_URL = "file:./data/dev.db";

/**
 * Works out which database to talk to.
 *
 * - Production (Vercel): DATABASE_URL is a `libsql://…` Turso URL and
 *   DATABASE_AUTH_TOKEN holds the token.
 * - Local dev: nothing set, so we fall back to the SQLite file at ./data/dev.db.
 */
export function resolveDbConfig(): DbConfig {
  const url = process.env.DATABASE_URL?.trim() || DEFAULT_LOCAL_URL;
  const isLocalFile = url.startsWith("file:") || !url.includes("://");

  if (!isLocalFile) {
    return {
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || undefined,
      isLocalFile: false,
    };
  }

  // Local file: make sure the folder exists and hand libsql an absolute path.
  const file = url.startsWith("file:") ? url.slice("file:".length) : url;
  const resolved = path.resolve(process.cwd(), file);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return { url: `file:${resolved}`, isLocalFile: true };
}

/** Absolute path of the local SQLite file (local dev only). */
export function resolveDbFile(): string {
  const { url, isLocalFile } = resolveDbConfig();
  if (!isLocalFile) {
    throw new Error("DATABASE_URL points at a remote database, not a file.");
  }
  return url.slice("file:".length);
}
