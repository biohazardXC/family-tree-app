export type Gender = "male" | "female" | "other";
export type AdoptionType = "adopted" | "step" | "foster";

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
  adoption: AdoptionType | null; // null = biological
}

/** An explicit sibling link, used when the shared parents aren't known yet. */
export interface SiblingEdgeDTO {
  id: string;
  aId: string;
  bId: string;
}

export interface TreeData {
  people: PersonDTO[];
  partnerships: PartnershipDTO[];
  parentEdges: ParentEdgeDTO[];
  siblingEdges?: SiblingEdgeDTO[];
}

export type RelationType = "partner" | "child" | "parent" | "sibling";

// ============ INVITES & SUBMISSIONS ============

export type InviteStatus = "pending" | "opened" | "submitted";

export interface InviteDTO {
  id: string;
  token: string;
  name: string;
  note: string | null;
  status: InviteStatus;
  createdAt: string;
  submittedAt: string | null;
}

export type SubmissionRole = "self" | "spouse" | "parent" | "child" | "sibling";
export type SubmissionStatus = "submitted" | "approved" | "rejected";

export interface PersonDraft {
  firstName: string;
  lastName?: string | null;
  maidenName?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
  notes?: string | null;
}

/** One person in a submission. Relations are relative to the "self" item. */
export interface SubmissionItem {
  key: string;
  role: SubmissionRole;
  person: PersonDraft;
  adoption?: AdoptionType | null;
  partnershipStatus?: string | null;
  /** Person in the tree the invitee confirmed they are (suggestion for the admin). */
  linkedTo?: string | null;
}

export interface SubmissionDTO {
  id: string;
  status: SubmissionStatus;
  inviteName: string;
  items: SubmissionItem[];
  createdAt: string;
  decidedAt: string | null;
}

// ============ MATCHING & GAPS ============

export type MatchConfidence = "likely" | "possible";

export interface MatchResult {
  person: PersonDTO;
  score: number; // 0–100
  confidence: MatchConfidence;
}

export interface GapItem {
  key: string;
  label: string;
}

export interface PersonGaps {
  person: PersonDTO;
  gaps: GapItem[];
}
