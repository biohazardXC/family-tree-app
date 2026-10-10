import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { parentEdges, partnerships, people } from "@/db/schema";
import { seedDemoFamily } from "@/db/seed";

export const dynamic = "force-dynamic";

/**
 * Demo data controls.
 * - { action: "clear" }  -> removes the demo people (anything you added yourself stays)
 * - { action: "wipe" }   -> deletes every person, leaving an empty tree
 * - { action: "reseed" } -> wipes everyone and restores the demo family
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { action?: string };

    if (body.action === "clear") {
      await db.delete(people).where(eq(people.isDemo, true));
      return NextResponse.json({ ok: true, action: "clear" });
    }

    // Going live: the owner wants a genuinely blank tree. Doing this as
    // reseed-then-clear only worked while demo people happened to exist,
    // which is exactly when it isn't needed.
    if (body.action === "wipe") {
      await db.delete(parentEdges).run();
      await db.delete(partnerships).run();
      await db.delete(people).run();
      return NextResponse.json({ ok: true, action: "wipe" });
    }

    if (body.action === "reseed") {
      await db.delete(parentEdges).run();
      await db.delete(partnerships).run();
      await db.delete(people).run();
      const count = await seedDemoFamily();
      return NextResponse.json({ ok: true, action: "reseed", count });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/demo failed:", err);
    return NextResponse.json({ error: "Could not update demo data" }, { status: 500 });
  }
}
