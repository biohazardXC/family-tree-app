import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { parentEdges, partnerships, people, siblingEdges } from "@/db/schema";

export const dynamic = "force-dynamic";

/** The whole tree in one response — people, couples and parent-child links. */
export async function GET() {
  const [peopleRows, partnershipRows, parentEdgeRows, siblingEdgeRows] = await Promise.all([
    db.select().from(people).orderBy(asc(people.createdAt)),
    db.select().from(partnerships).orderBy(asc(partnerships.createdAt)),
    db.select().from(parentEdges).orderBy(asc(parentEdges.createdAt)),
    db.select().from(siblingEdges).orderBy(asc(siblingEdges.createdAt)),
  ]);

  return NextResponse.json({
    people: peopleRows,
    partnerships: partnershipRows,
    parentEdges: parentEdgeRows,
    siblingEdges: siblingEdgeRows,
  });
}
