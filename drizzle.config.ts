import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile();
} catch {
  // no .env file — fall through to the default below
}

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: (process.env.DATABASE_URL ?? "file:./data/dev.db").replace(/^file:/, ""),
  },
});
