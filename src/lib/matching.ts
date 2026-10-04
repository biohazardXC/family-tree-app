import type { MatchConfidence, MatchResult, PersonDTO, PersonDraft } from "./types";
import { yearFromString } from "./person-utils";

/**
 * Fuzzy name matching — the "is this the same person?" engine.
 *
 * It survives:
 *  - typos ("Siphho" vs "Sipho")
 *  - spelling variants ("Johan" vs "Johannes" — prefix rule)
 *  - maiden vs married names
 *  - approximate birth years
 */

function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Classic Levenshtein edit distance (small strings, no library needed). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

/** 0–1 similarity of two strings. */
function similarity(a: string, b: string): number {
  if (!a && !b) return 1; // both empty = no information = neutral
  if (!a || !b) return 0;
  if (a === b) return 1;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length);
}

function firstNameSimilarity(a: string, b: string): number {
  let s = similarity(a, b);
  // Nickname rule: "Johan" is a prefix of "Johannes" — treat as very similar.
  if (s < 0.85 && a.length >= 3 && b.length >= 3) {
    if (a.startsWith(b) || b.startsWith(a)) s = Math.max(s, 0.85);
  }
  return s;
}

/** Best similarity across maiden/married name combinations. */
function lastNameSimilarity(
  draftLast: string,
  draftMaiden: string,
  pLast: string,
  pMaiden: string
): number {
  let best = 0;
  const pairs: [string, string][] = [
    [draftLast, pLast],
    [draftLast, pMaiden],
    [draftMaiden, pLast],
    [draftMaiden, pMaiden],
  ];
  for (const [a, b] of pairs) {
    if (a && b) best = Math.max(best, similarity(a, b));
  }
  return best;
}

function birthYearScore(draftYear: string | null, personYear: string | null): number {
  if (!draftYear || !personYear) return 0.45; // missing info = neutral
  const diff = Math.abs(Number(draftYear) - Number(personYear));
  if (diff === 0) return 1;
  if (diff <= 2) return 0.7;
  if (diff <= 5) return 0.35;
  return 0;
}

/** 0–100 score for "could draft and person be the same human?" */
export function scoreMatch(draft: PersonDraft, person: PersonDTO): number {
  const f = firstNameSimilarity(normalize(draft.firstName), normalize(person.firstName));
  const l = lastNameSimilarity(
    normalize(draft.lastName ?? ""),
    normalize(draft.maidenName ?? ""),
    normalize(person.lastName ?? ""),
    normalize(person.maidenName ?? "")
  );
  const hasLastInfo = Boolean(draft.lastName || draft.maidenName) && Boolean(person.lastName || person.maidenName);
  const nameScore = hasLastInfo ? 0.55 * f + 0.45 * l : f;
  const yearScore = birthYearScore(yearFromString(draft.birthDate ?? null), yearFromString(person.birthDate));
  return Math.round(100 * (nameScore * 0.78 + yearScore * 0.22));
}

export function confidenceOf(score: number): MatchConfidence | null {
  if (score >= 80) return "likely";
  if (score >= 60) return "possible";
  return null;
}

/** Best matches for a draft person, strongest first. */
export function findMatches(draft: PersonDraft, people: PersonDTO[], limit = 5): MatchResult[] {
  return people
    .map((person) => ({ person, score: scoreMatch(draft, person) }))
    .filter((m) => m.score >= 55)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((m) => ({ person: m.person, score: m.score, confidence: confidenceOf(m.score)! }));
}
