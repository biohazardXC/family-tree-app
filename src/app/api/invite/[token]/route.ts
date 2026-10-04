import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invites } from "@/db/schema";

export const dynamic = "force-dynamic";

/** Invitee opens their link: validate it and mark it as opened. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invite] = await db.select().from(invites).where(eq(invites.token, token));

  if (!invite) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (invite.status === "pending") {
    await db.update(invites).set({ status: "opened" }).where(eq(invites.id, invite.id));
  }

  return NextResponse.json({ name: invite.name, status: invite.status });
}
