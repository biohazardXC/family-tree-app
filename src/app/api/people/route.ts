import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { parentEdges, partnerships, people } from "@/db/schema";
import { linkSiblings, syncGroupParents } from "@/db/sibling-links";
import type { RelationType } from "@/lib/types";

export const dynamic = "force-dynamic";

const GENDERS = ["male", "female", "other"];

interface CreateBody {
  firstName?: string;
  lastName?: string;
  maidenName?: string;
  gender?: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  notes?: string;
  relation?: {
    type: RelationType;
    toId: string;
    partnershipStatus?: string;
    adoption?: string; // for children: "adopted" | "step" | "foster" (null = biological)
  };
}

function clean(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Creates a person, optionally linking them to an existing person at the same time:
 * partner / child / parent / sibling of <toId>.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateBody;

    const firstName = clean(body.firstName);
    if (!firstName) {
      return NextResponse.json({ error: "First name is required" }, { status: 400 });
    }

    if (body.relation) {
      const [anchor] = await db.select().from(people).where(eq(people.id, body.relation.toId));
      if (!anchor) {
        return NextResponse.json(
          { error: "The person to connect to was not found" },
          { status: 404 }
        );
      }
    }

    const [person] = await db
      .insert(people)
      .values({
        firstName,
        lastName: clean(body.lastName),
        maidenName: clean(body.maidenName),
        gender: GENDERS.includes(body.gender ?? "") ? body.gender! : null,
        birthDate: clean(body.birthDate),
        birthPlace: clean(body.birthPlace),
        deathDate: clean(body.deathDate),
        deathPlace: clean(body.deathPlace),
        notes: clean(body.notes),
      })
      .returning();

    if (body.relation) {
      const { type, toId } = body.relation;
      if (type === "partner") {
        await db.insert(partnerships).values({
          aId: toId,
          bId: person.id,
          status: clean(body.relation.partnershipStatus),
        });
      } else if (type === "child") {
        const adoption = ["adopted", "step", "foster"].includes(body.relation.adoption ?? "")
          ? body.relation.adoption!
          : null;
        await db
          .insert(parentEdges)
          .values({ parentId: toId, childId: person.id, adoption });
      } else if (type === "parent") {
        await db.insert(parentEdges).values({ parentId: person.id, childId: toId });
        // The new parent belongs to the anchor's whole sibling group.
        await syncGroupParents(toId);
      } else if (type === "sibling") {
        // A sibling shares the same parents — copy the anchor's parent links.
        const anchorParents = await db
          .select()
          .from(parentEdges)
          .where(eq(parentEdges.childId, toId));
        if (anchorParents.length > 0) {
          await db
            .insert(parentEdges)
            .values(anchorParents.map((e) => ({ parentId: e.parentId, childId: person.id })));
        } else {
          // No parents known yet — remember the sibling link itself, so the two
          // are still connected. Parents added later flow to both of them.
          await linkSiblings(toId, person.id);
        }
      }
    }

    return NextResponse.json(person, { status: 201 });
  } catch (err) {
    console.error("POST /api/people failed:", err);
    return NextResponse.json({ error: "Could not create the person" }, { status: 500 });
  }
}
