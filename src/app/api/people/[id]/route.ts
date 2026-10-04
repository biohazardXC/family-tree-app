import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { people } from "@/db/schema";

export const dynamic = "force-dynamic";

const GENDERS = ["male", "female", "other"];

const NULLABLE_TEXT_FIELDS = [
  "lastName",
  "maidenName",
  "birthDate",
  "birthPlace",
  "deathDate",
  "deathPlace",
  "notes",
] as const;

function clean(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

type PersonUpdate = Partial<typeof people.$inferInsert>;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const update: PersonUpdate = {};
    for (const field of NULLABLE_TEXT_FIELDS) {
      if (field in body) {
        update[field] = clean(body[field]);
      }
    }
    if ("firstName" in body) {
      const firstName = clean(body.firstName);
      if (!firstName) {
        return NextResponse.json({ error: "First name is required" }, { status: 400 });
      }
      update.firstName = firstName;
    }
    if ("gender" in body) {
      const g = typeof body.gender === "string" ? body.gender : "";
      update.gender = GENDERS.includes(g) ? g : null;
    }

    const [person] = await db
      .update(people)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(people.id, id))
      .returning();

    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    return NextResponse.json(person);
  } catch (err) {
    console.error(`PATCH /api/people/${id} failed:`, err);
    return NextResponse.json({ error: "Could not update the person" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [person] = await db.delete(people).where(eq(people.id, id)).returning();
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/people/${id} failed:`, err);
    return NextResponse.json({ error: "Could not remove the person" }, { status: 500 });
  }
}
