import { db } from "./index";
import { parentEdges, partnerships, people } from "./schema";
import { seedDemoFamily } from "./seed";

async function main() {
  db.delete(parentEdges).run();
  db.delete(partnerships).run();
  db.delete(people).run();
  const count = await seedDemoFamily();
  console.log(`Seeded ${count} demo people.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
