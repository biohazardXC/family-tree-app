import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { invites, submissions } from "@/db/schema";
import type { SubmissionItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/** All submissions for the admin, newest first. */
export async function GET() {
  const rows = await db.select().from(submissions).orderBy(desc(submissions.createdAt));
  const inviteRows = await db.select().from(invites);
  const nameById = new Map(inviteRows.map((i) => [i.id, i.name]));

  const result = rows.map((s) => {
    const items = JSON.parse(s.itemsJson) as SubmissionItem[];
    return {
      id: s.id,
      status: s.status,
      inviteName: nameById.get(s.inviteId) ?? "Unknown",
      itemCount: items.length,
      createdAt: s.createdAt,
      decidedAt: s.decidedAt,
    };
  });

  return NextResponse.json(result);
}
