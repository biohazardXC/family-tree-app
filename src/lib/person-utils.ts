import type { PersonDTO } from "./types";

export function fullName(p: PersonDTO): string {
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || "Unknown";
}

export function initials(p: PersonDTO): string {
  const a = (p.firstName?.[0] ?? "?").toUpperCase();
  const b = (p.lastName?.[0] ?? p.maidenName?.[0] ?? "").toUpperCase();
  return (a + b).trim() || "?";
}

/** Pulls the first 4-digit year (1800-2099) out of free-text like "abt. March 1948". */
export function yearFromString(s: string | null): string | null {
  if (!s) return null;
  const m = s.match(/\b(1[89][0-9]{2}|20[0-9]{2})\b/);
  return m ? m[1] : null;
}

export function lifespan(p: PersonDTO): string {
  const b = yearFromString(p.birthDate);
  const d = yearFromString(p.deathDate);
  if (b && d) return `${b} – ${d}`;
  if (b) return `b. ${b}`;
  if (d) return `d. ${d}`;
  return "";
}
