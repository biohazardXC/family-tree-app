import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { parentEdges, partnerships, people } from "@/db/schema";
import { linkSiblings, syncGroupParents } from "@/db/sibling-links";
import type { RelationType } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Body {
  type?: RelationType;
  /** The person already on screen. */
  toId?: string;
  /** The existing person being connected to them. */
  personId?: string;
  partnershipStatus?: string;
  adoption?: string;
}

function clean(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Connects two people who are *both already in the tree* — the "actually,
 * that's the same Johannes we already have" case.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const { type, toId, personId } = body;

    if (!type || !toId || !personId) {
      return NextResponse.json(
        { error: "type, toId and personId are all required." },
        { status: 400 }
      );
    }
    if (toId === personId) {
      return NextResponse.json(
        { error: "A person can't be related to themselves." },
        { status: 400 }
      );
    }

    const found = await db.select().from(people).where(or(eq(people.id, toId), eq(people.id, personId)));
    if (found.length < 2) {
      return NextResponse.json({ error: "One of those people no longer exists." }, { status: 404 });
    }

    if (type === "partner") {
      const existing = await db
        .select()
        .from(partnerships)
        .where(
          or(
            and(eq(partnerships.aId, toId), eq(partnerships.bId, personId)),
            and(eq(partnerships.aId, personId), eq(partnerships.bId, toId))
          )
        );
      if (existing.length === 0) {
        await db.insert(partnerships).values({
          aId: toId,
          bId: personId,
          status: clean(body.partnershipStatus),
        });
      }
    } else if (type === "child" || type === "parent") {
      const parentId = type === "child" ? toId : personId;
      const childId = type === "child" ? personId : toId;
      const adoption = ["adopted", "step", "foster"].includes(body.adoption ?? "")
        ? body.adoption!
        : null;
      const existing = await db
        .select()
        .from(parentEdges)
        .where(and(eq(parentEdges.parentId, parentId), eq(parentEdges.childId, childId)));
      if (existing.length === 0) {
        await db.insert(parentEdges).values({ parentId, childId, adoption });
      }
      await syncGroupParents(childId);
    } else if (type === "sibling") {
      await linkSiblings(toId, personId);
    } else {
      return NextResponse.json({ error: "Unknown relation type." }, { status: 400 });
    }

    const [updated] = await db.select().from(people).where(eq(people.id, personId));
    return NextResponse.json(updated);
  } catch (err) {
    console.error("POST /api/relations failed:", err);
    return NextResponse.json({ error: "Could not connect those two people." }, { status: 500 });
  }
}
