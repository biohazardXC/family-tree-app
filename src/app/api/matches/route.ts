import { NextResponse } from "next/server";
import { db } from "@/db";
import { people } from "@/db/schema";
import { findMatches } from "@/lib/matching";
import type { PersonDTO, PersonDraft } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Given a partially-typed person, who in the tree might this be? */
export async function POST(req: Request) {
  try {
    const draft = (await req.json()) as PersonDraft;
    if (!draft?.firstName?.trim()) {
      return NextResponse.json({ matches: [] });
    }
    const rows = await db.select().from(people);
    const all = rows.map((r) => ({ ...r, gender: r.gender as PersonDTO["gender"] }));
    return NextResponse.json({ matches: findMatches(draft, all, 5) });
  } catch (err) {
    console.error("POST /api/matches failed:", err);
    return NextResponse.json({ error: "Could not check for matches" }, { status: 500 });
  }
}
