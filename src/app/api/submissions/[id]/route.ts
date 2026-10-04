import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invites, people, submissions } from "@/db/schema";
import { findMatches } from "@/lib/matching";
import type { PersonDTO, SubmissionItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/** One submission in full, with "is this someone already in the tree?" suggestions. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [sub] = await db.select().from(submissions).where(eq(submissions.id, id));
  if (!sub) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const [invite] = await db.select().from(invites).where(eq(invites.id, sub.inviteId));
  const items = JSON.parse(sub.itemsJson) as SubmissionItem[];
  const rows = await db.select().from(people);
  const allPeople = rows.map((r) => ({ ...r, gender: r.gender as PersonDTO["gender"] }));

  const itemsWithMatches = items.map((item) => ({
    ...item,
    matches: findMatches(item.person, allPeople, 3),
  }));

  return NextResponse.json({
    id: sub.id,
    status: sub.status,
    inviteName: invite?.name ?? "Unknown",
    createdAt: sub.createdAt,
    decidedAt: sub.decidedAt,
    items: itemsWithMatches,
  });
}
