import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { parentEdges, partnerships, people, submissions } from "@/db/schema";
import { linkSiblings, syncGroupParents } from "@/db/sibling-links";
import type { AdoptionType, PersonDraft, SubmissionItem } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ItemDecision {
  mode: "create" | "link" | "skip";
  personId?: string; // for "link"
  fields?: string[]; // for "link": which submitted values to copy onto the existing person
}

const PATCHABLE_FIELDS = [
  "lastName",
  "maidenName",
  "gender",
  "birthDate",
  "birthPlace",
  "deathDate",
  "deathPlace",
  "notes",
] as const;

function clean(v: string | null | undefined): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

async function partnershipExists(aId: string, bId: string) {
  const rows = await db
    .select()
    .from(partnerships)
    .where(
      or(
        and(eq(partnerships.aId, aId), eq(partnerships.bId, bId)),
        and(eq(partnerships.aId, bId), eq(partnerships.bId, aId))
      )
    );
  return rows.length > 0;
}

async function parentEdgeExists(parentId: string, childId: string) {
  const rows = await db
    .select()
    .from(parentEdges)
    .where(and(eq(parentEdges.parentId, parentId), eq(parentEdges.childId, childId)));
  return rows.length > 0;
}

/**
 * The admin's decision on a submission.
 * For each item: "create" (new person), "link" (same as existing person), or "skip".
 * On approve, the app stitches everything into the tree.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = (await req.json()) as { action?: string; items?: Record<string, ItemDecision> };

    const [sub] = await db.select().from(submissions).where(eq(submissions.id, id));
    if (!sub) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    if (sub.status !== "submitted") {
      return NextResponse.json(
        { error: `This submission was already ${sub.status}.` },
        { status: 409 }
      );
    }

    if (body.action === "reject") {
      await db
        .update(submissions)
        .set({ status: "rejected", decidedAt: new Date() })
        .where(eq(submissions.id, id));
      return NextResponse.json({ ok: true, action: "rejected" });
    }

    if (body.action !== "approve") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const items = JSON.parse(sub.itemsJson) as SubmissionItem[];
    const decisions = body.items ?? {};
    const resolved = new Map<string, string>(); // item key -> person id

    const resolve = async (item: SubmissionItem): Promise<string | null> => {
      const d = decisions[item.key] ?? { mode: item.linkedTo ? "link" : "create" };
      if (d.mode === "skip") return null;

      if (d.mode === "link" && d.personId) {
        const [existing] = await db.select().from(people).where(eq(people.id, d.personId));
        if (!existing) throw new Error(`Person ${d.personId} not found for item ${item.key}`);
        if (d.fields && d.fields.length > 0) {
          const patch: Record<string, string | null> = {};
          for (const f of d.fields) {
            if (PATCHABLE_FIELDS.includes(f as (typeof PATCHABLE_FIELDS)[number])) {
              const value = clean(item.person[f as keyof PersonDraft] as string | null | undefined);
              if (value) patch[f] = value;
            }
          }
          if (Object.keys(patch).length > 0) {
            await db
              .update(people)
              .set({ ...patch, updatedAt: new Date() })
              .where(eq(people.id, d.personId));
          }
        }
        return d.personId;
      }

      // create a new person
      const p = item.person;
      const [created] = await db
        .insert(people)
        .values({
          firstName: p.firstName.trim(),
          lastName: clean(p.lastName),
          maidenName: clean(p.maidenName),
          gender: p.gender ?? null,
          birthDate: clean(p.birthDate),
          birthPlace: clean(p.birthPlace),
          deathDate: clean(p.deathDate),
          deathPlace: clean(p.deathPlace),
          notes: clean(p.notes),
        })
        .returning();
      return created.id;
    };

    const byRole = (role: SubmissionItem["role"]) => items.filter((i) => i.role === role);

    // 1. Self anchors everything
    const selfItem = byRole("self")[0];
    if (!selfItem) {
      return NextResponse.json({ error: "Submission has no 'self' person." }, { status: 400 });
    }
    const selfId = await resolve(selfItem);
    if (!selfId) {
      return NextResponse.json(
        { error: "The main person cannot be skipped." },
        { status: 400 }
      );
    }
    resolved.set(selfItem.key, selfId);

    // 2. Spouses (there may be a previous partner as well as a current one)
    let spouseId: string | null = null;
    const spouseItems = byRole("spouse");
    for (const item of spouseItems) {
      const pid = await resolve(item);
      if (pid) {
        if (spouseId === null) spouseId = pid;
        resolved.set(item.key, pid);
        if (pid !== selfId && !(await partnershipExists(selfId, pid))) {
          await db.insert(partnerships).values({
            aId: selfId,
            bId: pid,
            status: clean(item.partnershipStatus),
          });
        }
      }
    }

    // 3. Parents (of self)
    let addedParent = false;
    for (const item of byRole("parent")) {
      const pid = await resolve(item);
      if (!pid) continue;
      resolved.set(item.key, pid);
      if (pid !== selfId && !(await parentEdgeExists(pid, selfId))) {
        await db.insert(parentEdges).values({ parentId: pid, childId: selfId });
        addedParent = true;
      }
    }
    // Those parents belong to self's existing sibling group too.
    if (addedParent) await syncGroupParents(selfId);

    // 3b. Grandparents — parents of the parent the invitee named. We only
    // attach one when we know which parent they belong to, so a grandparent
    // can never land on the wrong side of the family.
    for (const item of byRole("grandparent")) {
      const parentId = item.ofParentKey ? resolved.get(item.ofParentKey) : null;
      if (!parentId) continue;
      const gid = await resolve(item);
      if (!gid || gid === parentId) continue;
      resolved.set(item.key, gid);
      if (!(await parentEdgeExists(gid, parentId))) {
        await db.insert(parentEdges).values({ parentId: gid, childId: parentId });
        await syncGroupParents(parentId);
      }
    }

    // 4. Children — of self, plus whichever partner the invitee named.
    for (const item of byRole("child")) {
      const cid = await resolve(item);
      if (!cid) continue;
      const adoption = (item.adoption ?? null) as AdoptionType | null;
      if (cid !== selfId && !(await parentEdgeExists(selfId, cid))) {
        await db.insert(parentEdges).values({ parentId: selfId, childId: cid, adoption });
      }

      // Only attach a second parent when we actually know who it is. Guessing
      // the current partner would be wrong for children of an earlier one.
      let otherParentId: string | null = null;
      if (item.otherParentKey) {
        otherParentId = resolved.get(item.otherParentKey) ?? null;
      } else if (spouseItems.length === 1) {
        // Older submissions, made before the question existed.
        otherParentId = spouseId;
      }

      if (otherParentId && otherParentId !== cid && !(await parentEdgeExists(otherParentId, cid))) {
        await db.insert(parentEdges).values({ parentId: otherParentId, childId: cid, adoption });
      }
    }

    // 5. Siblings — they share self's parents (including an existing person's parents
    //    if self was linked, which is exactly what you want)
    const selfParents = await db
      .select()
      .from(parentEdges)
      .where(eq(parentEdges.childId, selfId));
    for (const item of byRole("sibling")) {
      const sid = await resolve(item);
      if (!sid || sid === selfId) continue;
      const adoption = (item.adoption ?? null) as AdoptionType | null;
      if (selfParents.length === 0) {
        // No parents known — record the sibling link itself so the two are
        // still connected. Parents added later flow to the whole group.
        await linkSiblings(selfId, sid);
        continue;
      }
      for (const pe of selfParents) {
        if (!(await parentEdgeExists(pe.parentId, sid))) {
          await db.insert(parentEdges).values({ parentId: pe.parentId, childId: sid, adoption });
        }
      }
    }

    await db
      .update(submissions)
      .set({ status: "approved", decidedAt: new Date() })
      .where(eq(submissions.id, id));

    return NextResponse.json({ ok: true, action: "approved" });
  } catch (err) {
    console.error(`POST decision failed for ${id}:`, err);
    return NextResponse.json({ error: "Could not apply the decision." }, { status: 500 });
  }
}
