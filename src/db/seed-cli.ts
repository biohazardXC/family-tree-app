import { db } from "./index";
import { parentEdges, partnerships, people } from "./schema";
import { seedDemoFamily } from "./seed";

try {
  process.loadEnvFile();
} catch {
  // no .env file — fall back to environment variables / local default
}

/** Wipes everyone and restores the demo family. */
async function main() {
  await db.delete(parentEdges);
  await db.delete(partnerships);
  await db.delete(people);
  const count = await seedDemoFamily();
  console.log(`Seeded ${count} demo people.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
