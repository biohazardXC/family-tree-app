import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { parentEdges, partnerships, people } from "@/db/schema";
import { seedDemoFamily } from "@/db/seed";

export const dynamic = "force-dynamic";

/**
 * Demo data controls.
 * - { action: "clear" }  -> removes the demo people (anything you added yourself stays)
 * - { action: "reseed" } -> wipes everyone and restores the demo family
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { action?: string };

    if (body.action === "clear") {
      await db.delete(people).where(eq(people.isDemo, true));
      return NextResponse.json({ ok: true, action: "clear" });
    }

    if (body.action === "reseed") {
      db.delete(parentEdges).run();
      db.delete(partnerships).run();
      db.delete(people).run();
      const count = await seedDemoFamily();
      return NextResponse.json({ ok: true, action: "reseed", count });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/demo failed:", err);
    return NextResponse.json({ error: "Could not update demo data" }, { status: 500 });
  }
}
