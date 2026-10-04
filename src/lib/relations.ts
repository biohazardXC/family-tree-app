import type { TreeData } from "./types";
import { fullName } from "./person-utils";

export interface RelatedPerson {
  id: string;
  name: string;
  adoption: string | null;
}

export interface PersonRelations {
  parents: RelatedPerson[];
  partners: { id: string; name: string; status: string | null }[];
  children: RelatedPerson[];
}

/** Summarises how one person connects to everyone else (for panels). */
export function summarizeRelations(personId: string, data: TreeData): PersonRelations {
  const byId = new Map(data.people.map((p) => [p.id, p]));

  const parents: RelatedPerson[] = [];
  const children: RelatedPerson[] = [];
  const partners: PersonRelations["partners"] = [];

  for (const e of data.parentEdges) {
    if (e.childId === personId) {
      const parent = byId.get(e.parentId);
      if (parent) parents.push({ id: parent.id, name: fullName(parent), adoption: e.adoption });
    }
    if (e.parentId === personId) {
      const child = byId.get(e.childId);
      if (child) children.push({ id: child.id, name: fullName(child), adoption: e.adoption });
    }
  }

  for (const p of data.partnerships) {
    let otherId: string | null = null;
    if (p.aId === personId) otherId = p.bId;
    else if (p.bId === personId) otherId = p.aId;
    if (otherId) {
      const other = byId.get(otherId);
      if (other) partners.push({ id: other.id, name: fullName(other), status: p.status });
    }
  }

  return { parents, partners, children };
}
