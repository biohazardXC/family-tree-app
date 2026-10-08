import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { invites } from "@/db/schema";

export const dynamic = "force-dynamic";

/** List all invites, newest first. */
export async function GET() {
  const rows = await db.select().from(invites).orderBy(desc(invites.createdAt));
  return NextResponse.json(rows);
}

/** Create a new invite link for someone. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { name?: string; note?: string; multiUse?: boolean };
    const multiUse = body.multiUse === true;
    // A group link isn't addressed to anyone, so a label is enough.
    const name = body.name?.trim() || (multiUse ? "Family group link" : "");
    if (!name) {
      return NextResponse.json({ error: "Please give the invitee's name" }, { status: 400 });
    }

    const token = randomBytes(18).toString("base64url");
    const [invite] = await db
      .insert(invites)
      .values({
        token,
        name,
        note: body.note?.trim() || null,
        multiUse,
      })
      .returning();

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    return NextResponse.json({ invite, url: `${origin}/invite/${token}` }, { status: 201 });
  } catch (err) {
    console.error("POST /api/invites failed:", err);
    return NextResponse.json({ error: "Could not create the invite" }, { status: 500 });
  }
}
