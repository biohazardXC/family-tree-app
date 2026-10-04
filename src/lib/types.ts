export type Gender = "male" | "female" | "other";

export interface PersonDTO {
  id: string;
  firstName: string;
  lastName: string | null;
  maidenName: string | null;
  gender: Gender | null;
  birthDate: string | null;
  birthPlace: string | null;
  deathDate: string | null;
  deathPlace: string | null;
  notes: string | null;
  isDemo: boolean;
}

export interface PartnershipDTO {
  id: string;
  aId: string;
  bId: string;
  status: string | null;
}

export interface ParentEdgeDTO {
  id: string;
  parentId: string;
  childId: string;
}

export interface TreeData {
  people: PersonDTO[];
  partnerships: PartnershipDTO[];
  parentEdges: ParentEdgeDTO[];
}

export type RelationType = "partner" | "child" | "parent" | "sibling";
