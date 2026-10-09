/**
 * Dates in a family tree are rarely complete. Someone knows their mother's
 * birthday to the day, their grandmother's to the month, and their
 * great-grandfather's only to the year — and all three are worth recording.
 *
 * So a date is stored as the most precise of:
 *   "1936-03-12"  full date
 *   "1936-03"     month and year
 *   "1936"        year only
 *
 * and always shown to people as dd/mm/yyyy, mm/yyyy or yyyy.
 */

export interface DateParts {
  day: string;
  month: string;
  year: string;
}

export const emptyDateParts = (): DateParts => ({ day: "", month: "", year: "" });

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const pad = (s: string) => s.padStart(2, "0");

/**
 * Reads a stored value into day/month/year boxes. Deliberately forgiving:
 * older entries were free text, so "12 March 1936", "March 1936", "1936" and
 * "12/03/1936" all have to keep working.
 */
export function parseDateValue(value: string | null | undefined): DateParts {
  const out = emptyDateParts();
  if (!value) return out;
  const s = value.trim();
  if (!s) return out;

  // Canonical: yyyy-mm-dd / yyyy-mm / yyyy
  const iso = s.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
  if (iso) {
    out.year = iso[1];
    out.month = iso[2] ? pad(iso[2]) : "";
    out.day = iso[3] ? pad(iso[3]) : "";
    return out;
  }

  // dd/mm/yyyy or mm/yyyy
  const slash = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (slash) {
    out.day = pad(slash[1]);
    out.month = pad(slash[2]);
    out.year = slash[3];
    return out;
  }
  const slashShort = s.match(/^(\d{1,2})[/.-](\d{4})$/);
  if (slashShort) {
    out.month = pad(slashShort[1]);
    out.year = slashShort[2];
    return out;
  }

  // Free text with a month name: "12 March 1936", "March 1936"
  const year = s.match(/\b(1[5-9][0-9]{2}|20[0-9]{2})\b/);
  if (year) out.year = year[1];
  const lower = s.toLowerCase();
  const monthIdx = MONTH_NAMES.findIndex((m) => lower.includes(m.slice(0, 3)));
  if (monthIdx >= 0) out.month = pad(String(monthIdx + 1));
  const day = s.match(/\b([0-3]?[0-9])(?:st|nd|rd|th)?\b(?!\d)/);
  if (day && out.month && Number(day[1]) >= 1 && Number(day[1]) <= 31) {
    out.day = pad(day[1]);
  }
  return out;
}

/** Turns the three boxes into the value we store. Year is the minimum. */
export function dateValueFrom(parts: DateParts): string {
  const year = parts.year.trim();
  if (!/^\d{4}$/.test(year)) return "";
  const month = parts.month.trim();
  if (!month) return year;
  const mm = pad(month);
  const day = parts.day.trim();
  if (!day) return `${year}-${mm}`;
  return `${year}-${mm}-${pad(day)}`;
}

/** How a date is shown everywhere: dd/mm/yyyy, mm/yyyy, or yyyy. */
export function formatDate(value: string | null | undefined): string {
  const { day, month, year } = parseDateValue(value);
  if (!year) return value?.trim() ?? "";
  if (day && month) return `${day}/${month}/${year}`;
  if (month) return `${month}/${year}`;
  return year;
}

/** Validation message for the three boxes, or null when they're fine. */
export function dateProblem(parts: DateParts): string | null {
  const { day, month, year } = parts;
  if (!day && !month && !year) return null;
  if (!year) return "Please give at least a year.";
  if (!/^\d{4}$/.test(year.trim())) return "The year should be four digits, like 1936.";
  if (day && !month) return "Please choose a month as well, or clear the day.";
  if (month) {
    const m = Number(month);
    if (!Number.isInteger(m) || m < 1 || m > 12) return "The month should be between 1 and 12.";
  }
  if (day) {
    const d = Number(day);
    if (!Number.isInteger(d) || d < 1 || d > 31) return "The day should be between 1 and 31.";
    const m = Number(month);
    const y = Number(year);
    const inMonth = new Date(y, m, 0).getDate();
    if (d > inMonth) return `That month only has ${inMonth} days.`;
  }
  return null;
}
