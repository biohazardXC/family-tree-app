import type { Lang } from "./invite-i18n";

/**
 * The kinds of couple relationship the tree knows about.
 *
 * These used to live in three different places — the add-person form, the
 * invite form and the layout — and only the layout had a fallback for a
 * missing value. That fallback (silently "married") is what made a new
 * relationship look married when nobody had chosen a status. There is now
 * one list, and a status has to be chosen on purpose.
 */
export const PARTNERSHIP_STATUSES = [
  "married",
  "partners",
  "engaged",
  "divorced",
  "widowed",
] as const;

export type PartnershipStatus = (typeof PARTNERSHIP_STATUSES)[number];

/** Shown in the middle of a partner line. */
export const PARTNER_SYMBOL: Record<PartnershipStatus, string> = {
  married: "⚭", // joined rings
  engaged: "⚯", // open rings
  partners: "⚯",
  divorced: "⚮", // broken rings
  widowed: "⚰", // a death has ended the marriage
};

/** An old row with no status must never pretend to be a marriage. */
export const UNKNOWN_PARTNER_SYMBOL = "?";

export interface PartnershipStatusOption {
  value: PartnershipStatus;
  symbol: string;
  en: string;
  af: string;
}

export const PARTNERSHIP_STATUS_OPTIONS: PartnershipStatusOption[] = [
  { value: "married", symbol: "⚭", en: "Married", af: "Getroud" },
  { value: "partners", symbol: "⚯", en: "Partners", af: "Saamlewend" },
  { value: "engaged", symbol: "⚯", en: "Engaged", af: "Verloof" },
  { value: "divorced", symbol: "⚮", en: "Divorced", af: "Geskei" },
  { value: "widowed", symbol: "⚰", en: "Widowed", af: "Wewenaar / weduwee" },
];

export function isPartnershipStatus(value: unknown): value is PartnershipStatus {
  return (
    typeof value === "string" &&
    (PARTNERSHIP_STATUSES as readonly string[]).includes(value)
  );
}

/** Turns whatever the database or a request body holds into a known status. */
export function normalizePartnershipStatus(value: unknown): PartnershipStatus | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return isPartnershipStatus(trimmed) ? trimmed : null;
}

export function partnershipSymbol(status: string | null | undefined): string {
  const normalized = normalizePartnershipStatus(status);
  return normalized ? PARTNER_SYMBOL[normalized] : UNKNOWN_PARTNER_SYMBOL;
}

export function partnershipStatusLabel(
  status: string | null | undefined,
  lang: Lang
): string {
  const normalized = normalizePartnershipStatus(status);
  if (!normalized) return lang === "af" ? "Nie aangedui nie" : "Not set";
  const option = PARTNERSHIP_STATUS_OPTIONS.find((o) => o.value === normalized);
  return option ? option[lang] : normalized;
}

/** Wording for the two places a relationship status can be changed. */
export interface PartnershipStrings {
  statusTitle: string;
  statusHint: string;
  save: string;
  saving: string;
  saved: string;
  close: string;
  remove: string;
  removing: string;
  onlyStatus: string;
  choose: string;
  chooseError: string;
  saveError: string;
  removeError: string;
  removeConfirm: (a: string, b: string) => string;
  partners: string;
  noPartners: string;
  current: string;
  change: string;
  language: string;
}

export const PARTNERSHIP_STRINGS: Record<Lang, PartnershipStrings> = {
  en: {
    statusTitle: "Relationship status",
    statusHint: "Choose the status, then save. Only the status changes.",
    save: "Save status",
    saving: "Saving…",
    saved: "Saved",
    close: "Close",
    remove: "Remove relationship",
    removing: "Removing…",
    onlyStatus: "Both people, and their children, stay exactly as they are.",
    choose: "Choose a relationship status",
    chooseError: "Please choose a relationship status first.",
    saveError: "Could not save the status — please try again.",
    removeError: "Could not remove the relationship — please try again.",
    removeConfirm: (a, b) =>
      `Remove the relationship between ${a} and ${b}? Both people stay in the tree, and their children keep their parents.`,
    partners: "Partners",
    noPartners: "No partner recorded yet.",
    current: "Currently",
    change: "Change status",
    language: "Language",
  },
  af: {
    statusTitle: "Verhoudingstatus",
    statusHint: "Kies die status en stoor dit. Net die status verander.",
    save: "Stoor status",
    saving: "Stoor tans…",
    saved: "Gestoor",
    close: "Maak toe",
    remove: "Verwyder verhouding",
    removing: "Verwyder tans…",
    onlyStatus:
      "Albei mense, en hulle kinders, bly presies soos hulle is.",
    choose: "Kies ’n verhoudingstatus",
    chooseError: "Kies asseblief eers ’n verhoudingstatus.",
    saveError: "Kon nie die status stoor nie — probeer asseblief weer.",
    removeError: "Kon nie die verhouding verwyder nie — probeer asseblief weer.",
    removeConfirm: (a, b) =>
      `Verwyder die verhouding tussen ${a} en ${b}? Albei mense bly in die boom, en hulle kinders se ouers bly dieselfde.`,
    partners: "Lewensmaats",
    noPartners: "Nog geen lewensmaat aangeteken nie.",
    current: "Tans",
    change: "Verander status",
    language: "Taal",
  },
};
