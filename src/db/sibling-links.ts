import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "./index";
import { parentEdges, siblingEdges } from "./schema";

/**
 * Siblings are normally represented by sharing parents. When nobody knows the
 * parents yet we record an explicit sibling link instead, so the two people are
 * still visibly connected. These helpers keep the two representations in sync.
 */

/** Everyone directly sibling-linked to `personId` (not including them). */
export async function directSiblingIds(personId: string): Promise<string[]> {
  const rows = await db
    .select()
    .from(siblingEdges)
    .where(or(eq(siblingEdges.aId, personId), eq(siblingEdges.bId, personId)));
  return rows.map((r) => (r.aId === personId ? r.bId : r.aId));
}

/**
 * The whole sibling group `personId` belongs to, following links transitively,
 * so that A-B and B-C means A, B and C are all siblings. Includes `personId`.
 */
export async function siblingGroup(personId: string): Promise<string[]> {
  const seen = new Set<string>([personId]);
  const queue = [personId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const id of await directSiblingIds(current)) {
      if (!seen.has(id)) {
        seen.add(id);
        queue.push(id);
      }
    }
  }
  return [...seen];
}

async function parentEdgeExists(parentId: string, childId: string) {
  const rows = await db
    .select()
    .from(parentEdges)
    .where(and(eq(parentEdges.parentId, parentId), eq(parentEdges.childId, childId)));
  return rows.length > 0;
}

/**
 * Links two people as siblings.
 *
 * If either of them already has parents recorded, those parents are applied
 * across the whole group and no explicit link is needed. Otherwise an explicit
 * link is stored until a parent turns up.
 */
export async function linkSiblings(aId: string, bId: string): Promise<void> {
  if (aId === bId) return;

  const existing = await db
    .select()
    .from(siblingEdges)
    .where(
      or(
        and(eq(siblingEdges.aId, aId), eq(siblingEdges.bId, bId)),
        and(eq(siblingEdges.aId, bId), eq(siblingEdges.bId, aId))
      )
    );
  if (existing.length === 0) {
    await db.insert(siblingEdges).values({ aId, bId });
  }

  // Share out whatever parents are already known across the merged group.
  await syncGroupParents(aId);
}

/**
 * Makes sure every member of `personId`'s sibling group has every parent known
 * to any member. Call this after adding a parent to anyone.
 */
export async function syncGroupParents(personId: string): Promise<void> {
  const group = await siblingGroup(personId);
  if (group.length < 2) return;

  const edges = await db
    .select()
    .from(parentEdges)
    .where(inArray(parentEdges.childId, group));

  const parentIds = [...new Set(edges.map((e) => e.parentId))];
  if (parentIds.length === 0) return;

  for (const childId of group) {
    for (const parentId of parentIds) {
      if (parentId === childId) continue;
      if (!(await parentEdgeExists(parentId, childId))) {
        // adoption is specific to one child, so it is never copied across.
        await db.insert(parentEdges).values({ parentId, childId });
      }
    }
  }
}
