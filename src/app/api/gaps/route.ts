import { NextResponse } from "next/server";
import { db } from "@/db";
import { parentEdges, partnerships, people } from "@/db/schema";
import { yearFromString } from "@/lib/person-utils";
import type { GapItem, PersonGaps } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Missing & conflicting information across the whole tree —
 * the admin's spot-check / spot-fill list.
 */
export async function GET() {
  const [allPeople, allEdges, allPartnerships] = await Promise.all([
    db.select().from(people),
    db.select().from(parentEdges),
    db.select().from(partnerships),
  ]);

  const parentCount = new Map<string, number>();
  for (const e of allEdges) {
    parentCount.set(e.childId, (parentCount.get(e.childId) ?? 0) + 1);
  }

  const partnerIds = new Set<string>();
  for (const p of allPartnerships) {
    partnerIds.add(p.aId);
    partnerIds.add(p.bId);
  }

  const result: PersonGaps[] = [];

  for (const person of allPeople) {
    const gaps: GapItem[] = [];

    if (!person.birthDate?.trim()) gaps.push({ key: "birthDate", label: "Birth date unknown" });
    if (!person.birthPlace?.trim()) gaps.push({ key: "birthPlace", label: "Birth place unknown" });

    const pc = parentCount.get(person.id) ?? 0;
    if (pc === 0) gaps.push({ key: "parents", label: "No parents recorded" });
    if (pc === 1) gaps.push({ key: "parents-partial", label: "Only one parent recorded" });

    const birthYear = yearFromString(person.birthDate);
    const deathYear = yearFromString(person.deathDate);
    if (birthYear && deathYear && Number(deathYear) < Number(birthYear)) {
      gaps.push({ key: "dates-conflict", label: "Dates conflict: died before born" });
    }

    if (gaps.length > 0) {
      result.push({
        person: { ...person, gender: person.gender as PersonGaps["person"]["gender"] },
        gaps,
      });
    }
  }

  result.sort((a, b) => b.gaps.length - a.gaps.length || a.person.firstName.localeCompare(b.person.firstName));

  const counts = {
    people: allPeople.length,
    withGaps: result.length,
    totalGaps: result.reduce((n, r) => n + r.gaps.length, 0),
  };

  return NextResponse.json({ counts, people: result });
}
