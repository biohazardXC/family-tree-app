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

/**
 * Removes a submission from the review list.
 *
 * This deletes the record of what someone sent, not the people it created:
 * anyone already approved into the tree stays there, and is removed from the
 * tree itself if that's what's wanted. Rejected, duplicate and test
 * submissions otherwise pile up forever.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [gone] = await db.delete(submissions).where(eq(submissions.id, id)).returning();
    if (!gone) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/submissions/${id} failed:`, err);
    return NextResponse.json({ error: "Could not remove the submission" }, { status: 500 });
  }
}
