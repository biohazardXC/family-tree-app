import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invites, submissions } from "@/db/schema";
import type { SubmissionItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/** The invitee submits their completed form. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const [invite] = await db.select().from(invites).where(eq(invites.token, token));
    if (!invite) {
      return NextResponse.json({ error: "This invite link is not valid." }, { status: 404 });
    }
    if (invite.status === "submitted" && !invite.multiUse) {
      return NextResponse.json(
        { error: "This invite has already been submitted." },
        { status: 409 }
      );
    }

    const body = (await req.json()) as { items?: SubmissionItem[] };
    const items = Array.isArray(body.items) ? body.items : [];

    const self = items.find((i) => i.role === "self");
    if (!self || !self.person.firstName?.trim()) {
      return NextResponse.json({ error: "Your own details are required." }, { status: 400 });
    }
    for (const item of items) {
      if (!item.person.firstName?.trim()) {
        return NextResponse.json(
          { error: "Every person needs at least a first name." },
          { status: 400 }
        );
      }
    }

    await db.insert(submissions).values({
      inviteId: invite.id,
      itemsJson: JSON.stringify(items),
    });
    // A group link stays open so the rest of the family can still use it.
    await db
      .update(invites)
      .set({
        status: invite.multiUse ? "opened" : "submitted",
        submittedAt: new Date(),
      })
      .where(eq(invites.id, invite.id));

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("POST submit failed:", err);
    return NextResponse.json({ error: "Could not submit — please try again." }, { status: 500 });
  }
}
