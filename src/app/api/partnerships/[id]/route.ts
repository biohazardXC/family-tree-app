import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { partnerships } from "@/db/schema";
import { normalizePartnershipStatus } from "@/lib/partnership-status";

export const dynamic = "force-dynamic";

interface PatchBody {
  status?: unknown;
}

/**
 * Changes a couple's relationship status and nothing else.
 *
 * Deliberately narrow: it writes one column on one partnership row. The two
 * people, their details and every parent-child link are untouched, so a
 * correction to "they were never married" can't disturb the rest of the
 * family. Only the admin can reach this — the site-wide middleware locks
 * every /api write (and the /share page is public but read-only).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = (await req.json()) as PatchBody;
    const status = normalizePartnershipStatus(body.status);
    if (!status) {
      return NextResponse.json(
        {
          error:
            "Choose a relationship status: married, partners, engaged, divorced or widowed.",
        },
        { status: 400 }
      );
    }

    const [partnership] = await db
      .update(partnerships)
      .set({ status })
      .where(eq(partnerships.id, id))
      .returning();

    if (!partnership) {
      return NextResponse.json({ error: "That relationship was not found." }, { status: 404 });
    }

    return NextResponse.json(partnership);
  } catch (err) {
    console.error(`PATCH /api/partnerships/${id} failed:`, err);
    return NextResponse.json(
      { error: "Could not change the relationship status." },
      { status: 500 }
    );
  }
}

/**
 * Removes the couple link only. Both people remain, and their children keep
 * both parents — a partnership row is not what makes someone a parent.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [partnership] = await db
      .delete(partnerships)
      .where(eq(partnerships.id, id))
      .returning();

    if (!partnership) {
      return NextResponse.json({ error: "That relationship was not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/partnerships/${id} failed:`, err);
    return NextResponse.json(
      { error: "Could not remove the relationship." },
      { status: 500 }
    );
  }
}
