import { db } from "./index";
import { parentEdges, partnerships, people } from "./schema";
import { DEMO_PARENT_LINKS, DEMO_PARTNERSHIPS, DEMO_PEOPLE } from "../lib/seed-data";

/** Creates the demo family. Does not delete anything first. */
export async function seedDemoFamily(): Promise<number> {
  const ids = new Map<string, string>();
  const base = Date.now();

  let i = 0;
  for (const p of DEMO_PEOPLE) {
    const createdAt = new Date(base + i);
    const [created] = await db
      .insert(people)
      .values({
        firstName: p.firstName,
        lastName: p.lastName ?? null,
        maidenName: p.maidenName ?? null,
        gender: p.gender ?? null,
        birthDate: p.birthDate ?? null,
        birthPlace: p.birthPlace ?? null,
        deathDate: p.deathDate ?? null,
        deathPlace: p.deathPlace ?? null,
        notes: p.notes ?? null,
        isDemo: true,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();
    ids.set(p.key, created.id);
    i += 1;
  }

  let j = 0;
  for (const s of DEMO_PARTNERSHIPS) {
    await db.insert(partnerships).values({
      aId: ids.get(s.a)!,
      bId: ids.get(s.b)!,
      status: s.status ?? null,
      createdAt: new Date(base + 10_000 + j),
    });
    j += 1;
  }

  let k = 0;
  for (const l of DEMO_PARENT_LINKS) {
    await db.insert(parentEdges).values({
      parentId: ids.get(l.parent)!,
      childId: ids.get(l.child)!,
      adoption: l.adoption ?? null,
      createdAt: new Date(base + 20_000 + k),
    });
    k += 1;
  }

  return DEMO_PEOPLE.length;
}
