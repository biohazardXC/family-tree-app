"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchResult, PersonDraft } from "@/lib/types";
import { fullName, lifespan } from "@/lib/person-utils";
import { formatDate } from "@/lib/dates";
import { LANGUAGES, stringsFor, type Lang, type Strings } from "@/lib/invite-i18n";
import DateField from "./DateField";

/**
 * The invitee's form. Design goals:
 * - So simple a grandparent can use it on a phone
 * - Every step skippable, plain language, big buttons
 * - Only their immediate family
 * - Notices when someone is already in the tree and offers to link
 */

interface Draft {
  firstName: string;
  lastName: string;
  maidenName: string;
  gender: string;
  birthDate: string;
  birthPlace: string;
  deathDate: string;
  deathPlace: string;
}

interface Entry {
  draft: Draft;
  adoption: string; // for children/siblings
  partnershipStatus: string; // for spouse
  /** For children: index into `partners` of the other parent, or "" for none. */
  otherParent: string;
  linkedTo: string | null;
  linkedName: string | null;
  dismissed: string[];
}

const emptyDraft = (): Draft => ({
  firstName: "",
  lastName: "",
  maidenName: "",
  gender: "",
  birthDate: "",
  birthPlace: "",
  deathDate: "",
  deathPlace: "",
});

const emptyEntry = (): Entry => ({
  draft: emptyDraft(),
  adoption: "",
  partnershipStatus: "married",
  otherParent: "",
  linkedTo: null,
  linkedName: null,
  dismissed: [],
});

const hasContent = (d: Draft) =>
  Object.values(d).some((v) => v.trim() !== "") || d.gender !== "";

const inputCls =
  "w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {hint && <span className="block text-xs text-slate-400">{hint}</span>}
      <input
        className={`mt-1 ${inputCls}`}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function GenderSelect({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  t: Strings;
}) {
  return (
    <div>
      <span className="text-sm font-semibold text-slate-700">{t.gender}</span>
      <div className="mt-1 flex gap-2">
        {[
          ["female", t.female],
          ["male", t.male],
        ].map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(value === v ? "" : v)}
            className={`flex-1 rounded-xl border px-3 py-3 text-base font-medium ${
              value === v
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Watches what's typed and asks "is this someone we already know?" */
function MatchPrompt({
  entry,
  onChange,
  t,
}: {
  entry: Entry;
  onChange: (e: Entry) => void;
  t: Strings;
}) {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [checking, setChecking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { firstName, lastName } = entry.draft;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (firstName.trim().length < 2) {
      setMatches([]);
      return;
    }
    setChecking(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName: lastName || null,
            birthDate: entry.draft.birthDate || null,
          } satisfies PersonDraft),
        });
        const j = (await res.json()) as { matches?: MatchResult[] };
        setMatches((j.matches ?? []).filter((m) => !entry.dismissed.includes(m.person.id) && m.person.id !== entry.linkedTo));
      } catch {
        setMatches([]);
      } finally {
        setChecking(false);
      }
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [firstName, lastName, entry.draft.birthDate, entry.dismissed, entry.linkedTo]);

  if (entry.linkedTo) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        ✓ {t.matchLinked(entry.linkedName ?? "")}
        <button
          type="button"
          className="ml-2 font-medium text-emerald-700 underline"
          onClick={() => onChange({ ...entry, linkedTo: null, linkedName: null })}
        >
          {t.matchUndo}
        </button>
      </div>
    );
  }

  if (matches.length === 0) {
    return checking ? (
      <p className="text-xs text-slate-400">{t.matchChecking}</p>
    ) : null;
  }

  const top = matches[0];
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm font-medium text-amber-900">
        {t.matchMaybe(firstName.trim())}
      </p>
      <p className="mt-1 text-sm text-amber-800">
        <strong>{fullName(top.person)}</strong>
        {lifespan(top.person) ? ` (${lifespan(top.person)})` : ""} — {t.matchScore(top.score)}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() =>
            onChange({
              ...entry,
              linkedTo: top.person.id,
              linkedName: fullName(top.person),
            })
          }
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {t.matchYes}
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...entry, dismissed: [...entry.dismissed, top.person.id] })}
          className="rounded-full border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
        >
          {t.matchNo}
        </button>
      </div>
    </div>
  );
}

function EntryFields({
  entry,
  onChange,
  showPassed,
  children,
  t,
  lang,
}: {
  entry: Entry;
  onChange: (e: Entry) => void;
  showPassed: boolean;
  children?: React.ReactNode;
  t: Strings;
  lang: Lang;
}) {
  const d = entry.draft;
  const set = (key: keyof Draft) => (v: string) => onChange({ ...entry, draft: { ...d, [key]: v } });

  return (
    <div className="space-y-4">
      <Field label={t.firstName} value={d.firstName} onChange={set("firstName")} />
      <Field label={t.surname} value={d.lastName} onChange={set("lastName")} placeholder={t.surnameHint} />
      <Field
        label={t.maidenName}
        hint={t.maidenHint}
        value={d.maidenName}
        onChange={set("maidenName")}
      />
      <GenderSelect
        value={d.gender}
        onChange={(v) => onChange({ ...entry, draft: { ...d, gender: v } })}
        t={t}
      />
      <DateField
        label={t.birthDate}
        hint={t.birthDateHint}
        value={d.birthDate}
        onChange={set("birthDate")}
        lang={lang}
      />
      <Field
        label={t.birthPlace}
        value={d.birthPlace}
        onChange={set("birthPlace")}
        placeholder={t.birthPlacePlaceholder}
      />

      {showPassed && (
        <details className="rounded-xl bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-600">
            {t.hasPassed}
          </summary>
          <div className="mt-3 space-y-3">
            <DateField label={t.deathDate} value={d.deathDate} onChange={set("deathDate")} lang={lang} />
            <Field
              label={t.deathPlace}
              value={d.deathPlace}
              onChange={set("deathPlace")}
              placeholder={t.deathPlacePlaceholder}
            />
          </div>
        </details>
      )}

      {children}

      <MatchPrompt entry={entry} onChange={onChange} t={t} />
    </div>
  );
}

const adoptionOptions = (t: Strings): [string, string][] => [
  ["", t.adoptionBio],
  ["adopted", t.adoptionAdopted],
  ["step", t.adoptionStep],
  ["foster", t.adoptionFoster],
];

const stepNames = (t: Strings) => [
  t.stepYou,
  t.stepPartner,
  t.stepParents,
  t.stepGrandparents,
  t.stepChildren,
  t.stepSiblings,
  t.stepReview,
];
const STEP_COUNT = 7;

export default function InviteWizard({ token }: { token: string }) {
  const [phase, setPhase] = useState<"loading" | "welcome" | "form" | "done" | "invalid" | "already">("loading");
  const [inviteName, setInviteName] = useState("");
  const [lang, setLang] = useState<Lang | null>(null);
  const t = stringsFor(lang ?? "en");
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [self, setSelf] = useState<Entry>(emptyEntry);
  const [partners, setPartners] = useState<Entry[]>([]);
  const [parents, setParents] = useState<(Entry | null)[]>([null, null]);
  // Grandparents hang off a parent slot: [parent index][0 = mother, 1 = father].
  const [grandparents, setGrandparents] = useState<(Entry | null)[][]>([
    [null, null],
    [null, null],
  ]);
  const [children, setChildren] = useState<Entry[]>([]);
  const [siblings, setSiblings] = useState<Entry[]>([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("rooted-lang");
      if (saved === "en" || saved === "af") setLang(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then(async (r) => {
        if (r.status === 404) {
          setPhase("invalid");
          return;
        }
        const j = (await r.json()) as { name: string; status: string };
        setInviteName(j.name);
        setPhase(j.status === "submitted" ? "already" : "welcome");
      })
      .catch(() => setPhase("invalid"));
  }, [token]);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const items = [] as Record<string, unknown>[];
      const push = (e: Entry, role: string, extra: Record<string, unknown> = {}, key?: string) => {
        if (!e.draft.firstName.trim()) return;
        items.push({
          key: key ?? `${role}-${items.length}`,
          role,
          person: {
            firstName: e.draft.firstName,
            lastName: e.draft.lastName || null,
            maidenName: e.draft.maidenName || null,
            gender: e.draft.gender || null,
            birthDate: e.draft.birthDate || null,
            birthPlace: e.draft.birthPlace || null,
            deathDate: e.draft.deathDate || null,
            deathPlace: e.draft.deathPlace || null,
          },
          linkedTo: e.linkedTo,
          ...extra,
        });
      };

      push(self, "self");

      // Stable keys so each child can point at the right partner.
      const partnerKeys = new Map<number, string>();
      partners.forEach((sp, i) => {
        if (!sp.draft.firstName.trim()) return;
        const key = `spouse-${i}`;
        partnerKeys.set(i, key);
        push(sp, "spouse", { partnershipStatus: sp.partnershipStatus }, key);
      });

      // Stable keys so each grandparent can point at the right parent.
      const parentKeys = new Map<number, string>();
      parents.forEach((p, i) => {
        if (!p || !p.draft.firstName.trim()) return;
        const key = `parent-${i}`;
        parentKeys.set(i, key);
        push(p, "parent", {}, key);
      });

      grandparents.forEach((row, pi) => {
        const ofParentKey = parentKeys.get(pi) ?? null;
        if (!ofParentKey) return; // no parent given, so nothing to attach to
        row.forEach((gp, gi) => {
          if (!gp) return;
          push(gp, "grandparent", { ofParentKey }, `grandparent-${pi}-${gi}`);
        });
      });
      for (const c of children) {
        const idx = c.otherParent === "" ? null : Number(c.otherParent);
        push(c, "child", {
          adoption: c.adoption || null,
          otherParentKey: idx !== null ? (partnerKeys.get(idx) ?? null) : null,
        });
      }
      for (const s of siblings) push(s, "sibling", { adoption: s.adoption || null });

      const res = await fetch(`/api/invite/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "Could not send");
      }
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send — please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [self, partners, parents, children, siblings, token]);

  // ---------- screens ----------

  // The language question comes before the welcome screen, so an Afrikaans
  // relative never has to read a screen of English to find it.
  if (lang === null && phase !== "loading" && phase !== "invalid") {
    return (
      <Shell t={t}>
        <div className="py-14 text-center">
          <div className="text-5xl">🌳</div>
          <h1 className="mt-5 text-xl font-bold text-slate-900">Choose your language</h1>
          <p className="mt-1 text-xl font-bold text-slate-900">Kies jou taal</p>
          <div className="mt-8 space-y-3">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  try {
                    window.localStorage.setItem("rooted-lang", l.code);
                  } catch {
                    // private browsing — the choice just won't be remembered
                  }
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-5 text-left hover:border-emerald-400 hover:bg-emerald-50"
              >
                <span className="block text-lg font-bold text-slate-900">{l.label}</span>
                <span className="block text-sm text-slate-500">{l.note}</span>
              </button>
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-sm text-slate-400">
        {t.loading}
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <Shell t={t}>
        <div className="py-16 text-center">
          <div className="text-4xl">🔗</div>
          <h1 className="mt-4 text-xl font-semibold">{t.invalidTitle}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {t.invalidBody}
          </p>
        </div>
      </Shell>
    );
  }

  if (phase === "already" || phase === "done") {
    return (
      <Shell t={t}>
        <div className="py-16 text-center">
          <div className="text-4xl">🎉</div>
          <h1 className="mt-4 text-xl font-semibold">
            {phase === "done" ? t.doneThanks : t.doneAllSet}, {inviteName.split(" ")[0]}!
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t.doneBody}
          </p>
          <p className="mx-auto mt-4 max-w-sm text-sm text-slate-500">
            {t.doneMore}
          </p>
          <Link
            href="/tree"
            className="mt-6 inline-block rounded-full bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-700"
          >
            {t.doneView}
          </Link>
        </div>
      </Shell>
    );
  }

  if (phase === "welcome") {
    return (
      <Shell t={t}>
        <div className="py-12 text-center">
          <div className="text-5xl">🌳</div>
          <h1 className="mt-5 text-2xl font-bold">{t.welcomeHello(inviteName.split(" ")[0])}</h1>
          <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-slate-600">
            {t.welcomeBody} <strong>{t.welcomeImmediate}</strong>.
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
            {t.welcomeTime}
          </p>
          <button
            onClick={() => setPhase("form")}
            className="mt-8 rounded-full bg-emerald-600 px-8 py-4 text-lg font-bold text-white shadow-md hover:bg-emerald-700"
          >
            {t.welcomeStart}
          </button>
          <div className="mt-4">
            <Link href="/tree" className="text-sm font-medium text-emerald-700 underline">
              {t.welcomeJustView}
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- form steps ----------

  const canContinue = (): string | null => {
    if (step === 0 && !self.draft.firstName.trim()) return t.errNeedFirstName;
    const check = (label: string, e: Entry | null) => {
      if (!e) return null;
      if (!e.draft.firstName.trim() && hasContent(e.draft))
        return t.errNeedNameFor(label);
      return null;
    };
    let err: string | null = null;
    for (let i = 0; i < partners.length; i++) {
      err = check(t.labelPartnerN(i + 1), partners[i]);
      if (err) return err;
    }
    for (let i = 0; i < parents.length; i++) {
      err = check(t.labelParentN(i + 1), parents[i]);
      if (err) return err;
    }
    err = check("child", null) ?? null;
    for (const c of children) {
      if (!c.draft.firstName.trim()) return t.errNeedChildName;
    }
    for (const s of siblings) {
      if (!s.draft.firstName.trim()) return t.errNeedSiblingName;
    }
    return null;
  };

  const next = () => {
    const err = canContinue();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
    window.scrollTo({ top: 0 });
  };
  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0 });
  };

  return (
    <Shell t={t}>
      {/* progress */}
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-slate-100 bg-slate-50/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>
            {t.stepOf(step + 1, STEP_COUNT)}
          </span>
          <span className="text-slate-400">{stepNames(t)[step]}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
          />
        </div>
      </div>

      {step === 0 && (
        <StepWrap title={t.youTitle} subtitle={t.youSubtitle}>
          <EntryFields entry={self} onChange={setSelf} showPassed={false} t={t} lang={lang ?? "en"} />
        </StepWrap>
      )}

      {step === 1 && (
        <StepWrap
          title={t.partnerTitle}
          subtitle={t.partnerSubtitle}
        >
          <div className="space-y-6">
            {partners.map((sp, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">
                    {sp.partnershipStatus === "divorced" ? t.previousPartnerLabel : t.partnerLabel}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setPartners((prev) => prev.filter((_, j) => j !== i));
                      // keep each child's "other parent" pointing at the right person
                      setChildren((prev) =>
                        prev.map((c) => {
                          if (c.otherParent === "") return c;
                          const idx = Number(c.otherParent);
                          if (idx === i) return { ...c, otherParent: "" };
                          return idx > i ? { ...c, otherParent: String(idx - 1) } : c;
                        })
                      );
                    }}
                    className="text-xs font-medium text-rose-500 hover:underline"
                  >
                    {t.remove}
                  </button>
                </div>
                <EntryFields
                  entry={sp}
                  onChange={(e) => setPartners((prev) => prev.map((x, j) => (j === i ? e : x)))}
                  showPassed
                  t={t}
                  lang={lang ?? "en"}
                >
                  <div>
                    <span className="text-sm font-semibold text-slate-700">{t.relationship}</span>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {([
                        ["married", t.statusMarried],
                        ["partners", t.statusPartners],
                        ["divorced", t.statusDivorced],
                        ["widowed", t.statusWidowed],
                      ] as [string, string][]).map(([st, stLabel]) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() =>
                            setPartners((prev) =>
                              prev.map((x, j) => (j === i ? { ...x, partnershipStatus: st } : x))
                            )
                          }
                          className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${
                            sp.partnershipStatus === st
                              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {stLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                </EntryFields>
              </div>
            ))}

            {partners.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-600">{t.partnerQuestion}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setPartners([emptyEntry()])}
                    className="flex-1 rounded-full bg-emerald-600 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-700"
                  >
                    {t.yes}
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 rounded-full border border-slate-200 px-4 py-3 text-base font-medium text-slate-600 hover:bg-slate-100"
                  >
                    {t.skipThis}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setPartners((prev) => [...prev, { ...emptyEntry(), partnershipStatus: "divorced" }])
                }
                className="w-full rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm font-medium text-slate-500 hover:border-emerald-400 hover:text-emerald-700"
              >
                {t.addAnotherPartner}
              </button>
            )}
          </div>
        </StepWrap>
      )}

      {step === 2 && (
        <StepWrap title={t.parentsTitle} subtitle={t.parentsSubtitle}>
          <div className="space-y-6">
            {parents.map((p, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">{t.parentN(i + 1)}</h3>
                  {p !== null && (
                    <button
                      type="button"
                      onClick={() =>
                        setParents((prev) => prev.map((x, j) => (j === i ? null : x)))
                      }
                      className="text-xs font-medium text-rose-500 hover:underline"
                    >
                      {t.remove}
                    </button>
                  )}
                </div>
                {p === null ? (
                  <button
                    type="button"
                    onClick={() => setParents((prev) => prev.map((x, j) => (j === i ? emptyEntry() : x)))}
                    className="w-full rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm font-medium text-slate-500 hover:border-emerald-400 hover:text-emerald-700"
                  >
                    {t.addParentN(i + 1)}
                  </button>
                ) : (
                  <EntryFields
                    entry={p}
                    onChange={(e) => setParents((prev) => prev.map((x, j) => (j === i ? e : x)))}
                    showPassed
                    t={t}
                    lang={lang ?? "en"}
                  />
                )}
              </div>
            ))}
          </div>
        </StepWrap>
      )}

      {step === 3 && (
        <StepWrap
          title={t.grandparentsTitle}
          subtitle={t.grandparentsSubtitle}
        >
          {parents.every((p) => p === null) ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
              <p className="text-sm text-slate-600">
                {t.grandparentsNeedParent}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {parents.map((parent, pi) =>
                parent === null ? null : (
                  <div key={pi} className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700">
                      {parent.draft.firstName.trim()
                        ? t.parentsOfNamed(parent.draft.firstName.trim())
                        : t.parentsOfIndex(pi + 1)}
                    </h3>

                    {[0, 1].map((gi) => {
                      const gp = grandparents[pi]?.[gi] ?? null;
                      const role = gi === 0 ? t.motherLabel : t.fatherLabel;
                      const setGp = (e: Entry | null) =>
                        setGrandparents((prev) =>
                          prev.map((row, r) =>
                            r === pi ? row.map((x, c) => (c === gi ? e : x)) : row
                          )
                        );
                      return (
                        <div
                          key={gi}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <span className="font-medium text-slate-800">{role}</span>
                            {gp !== null && (
                              <button
                                type="button"
                                onClick={() => setGp(null)}
                                className="text-xs font-medium text-rose-500 hover:underline"
                              >
                                {t.remove}
                              </button>
                            )}
                          </div>
                          {gp === null ? (
                            <button
                              type="button"
                              onClick={() => setGp(emptyEntry())}
                              className="w-full rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm font-medium text-slate-500 hover:border-emerald-400 hover:text-emerald-700"
                            >
                              {gi === 0 ? t.addMother : t.addFather}
                            </button>
                          ) : (
                            <EntryFields entry={gp} onChange={setGp} showPassed t={t} lang={lang ?? "en"} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-sm font-medium text-sky-900">
              {t.greatGrandTitle}
            </p>
            <p className="mt-1 text-sm text-sky-800">
              {t.greatGrandBody}
            </p>
          </div>
        </StepWrap>
      )}

      {step === 4 && (
        <StepWrap title={t.childrenTitle} subtitle={t.childrenSubtitle}>
          <div className="space-y-6">
            {children.map((c, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">{t.childN(i + 1)}</h3>
                  <button
                    type="button"
                    onClick={() => setChildren((prev) => prev.filter((_, j) => j !== i))}
                    className="text-xs font-medium text-rose-500 hover:underline"
                  >
                    {t.remove}
                  </button>
                </div>
                <EntryFields
                  entry={c}
                  onChange={(e) => setChildren((prev) => prev.map((x, j) => (j === i ? e : x)))}
                  showPassed={false}
                  t={t}
                  lang={lang ?? "en"}
                >
                  {partners.filter((sp) => sp.draft.firstName.trim()).length > 0 && (
                    <div>
                      <span className="text-sm font-semibold text-slate-700">
                        {t.otherParentQuestion}
                      </span>
                      <div className="mt-1 grid gap-2">
                        {partners.map((sp, pi) =>
                          sp.draft.firstName.trim() ? (
                            <button
                              key={pi}
                              type="button"
                              onClick={() =>
                                setChildren((prev) =>
                                  prev.map((x, j) => (j === i ? { ...x, otherParent: String(pi) } : x))
                                )
                              }
                              className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium ${
                                c.otherParent === String(pi)
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                  : "border-slate-200 bg-white text-slate-600"
                              }`}
                            >
                              {sp.draft.firstName} {sp.draft.lastName}
                              {sp.partnershipStatus === "divorced" ? t.previousPartnerSuffix : ""}
                            </button>
                          ) : null
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setChildren((prev) =>
                              prev.map((x, j) => (j === i ? { ...x, otherParent: "" } : x))
                            )
                          }
                          className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium ${
                            c.otherParent === ""
                              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {t.someoneElse}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-sm font-semibold text-slate-700">
                      {t.howJoined}
                    </span>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {adoptionOptions(t).map(([v, label]) => (
                        <button
                          key={v || "bio"}
                          type="button"
                          onClick={() => setChildren((prev) => prev.map((x, j) => (j === i ? { ...x, adoption: v } : x)))}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${
                            c.adoption === v
                              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </EntryFields>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setChildren((prev) => [...prev, emptyEntry()])}
              className="w-full rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm font-medium text-slate-500 hover:border-emerald-400 hover:text-emerald-700"
            >
              {t.addChild}
            </button>
          </div>
        </StepWrap>
      )}

      {step === 5 && (
        <StepWrap title={t.siblingsTitle} subtitle={t.siblingsSubtitle}>
          <div className="space-y-6">
            {siblings.map((s, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">{t.siblingN(i + 1)}</h3>
                  <button
                    type="button"
                    onClick={() => setSiblings((prev) => prev.filter((_, j) => j !== i))}
                    className="text-xs font-medium text-rose-500 hover:underline"
                  >
                    {t.remove}
                  </button>
                </div>
                <EntryFields
                  entry={s}
                  onChange={(e) => setSiblings((prev) => prev.map((x, j) => (j === i ? e : x)))}
                  showPassed
                  t={t}
                  lang={lang ?? "en"}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSiblings((prev) => [...prev, emptyEntry()])}
              className="w-full rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm font-medium text-slate-500 hover:border-emerald-400 hover:text-emerald-700"
            >
              {t.addSibling}
            </button>
          </div>
        </StepWrap>
      )}

      {step === 6 && (
        <StepWrap title={t.reviewTitle} subtitle={t.reviewSubtitle}>
          <ReviewList
            entries={[
              { label: t.reviewYou, entry: self },
              ...partners
                .filter((sp) => sp.draft.firstName)
                .map((sp) => ({
                  label: sp.partnershipStatus === "divorced" ? t.previousPartnerLabel : t.partnerLabel,
                  entry: sp,
                })),
              ...parents.filter((p) => p?.draft.firstName).map((p, i) => ({ label: t.parentN(i + 1), entry: p! })),
              ...children.filter((c) => c.draft.firstName).map((c, i) => ({ label: t.childN(i + 1), entry: c })),
              ...siblings.filter((s) => s.draft.firstName).map((s, i) => ({ label: t.siblingN(i + 1), entry: s })),
            ]}
            onJump={setStep}
            t={t}
          />
          <button
            onClick={() => void submit()}
            disabled={submitting}
            className="mt-6 w-full rounded-full bg-emerald-600 px-6 py-4 text-lg font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? t.sending : t.send}
          </button>
        </StepWrap>
      )}

      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}

      {/* nav */}
      <div className="mt-8 mb-10 flex gap-3">
        <button
          onClick={back}
          disabled={step === 0}
          className="rounded-full border border-slate-200 px-6 py-3 text-base font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          {t.back}
        </button>
        {step < STEP_COUNT - 1 && (
          <button
            onClick={next}
            className="flex-1 rounded-full bg-slate-900 px-6 py-3 text-base font-semibold text-white hover:bg-slate-700"
          >
            {t.continue}
          </button>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children, t }: { children: React.ReactNode; t: Strings }) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-6">
      <div className="mb-6 text-center">
        <span className="text-2xl">🌳</span>
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">{t.brand}</p>
      </div>
      {children}
    </div>
  );
}

function StepWrap({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function ReviewList({
  entries,
  onJump,
  t,
}: {
  entries: { label: string; entry: Entry }[];
  onJump: (step: number) => void;
  t: Strings;
}) {
  const jumpMap: Record<string, number> = {
    [t.reviewYou]: 0,
    [t.partnerLabel]: 1,
    [t.previousPartnerLabel]: 1,
  };
  if (entries.every((e) => !e.entry.draft.firstName)) {
    return (
      <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-500">
        {t.reviewEmpty}
      </p>
    );
  }
  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {entries
        .filter((e) => e.entry.draft.firstName)
        .map(({ label, entry }) => (
          <div key={label} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="truncate text-base font-semibold text-slate-800">
                {entry.draft.firstName} {entry.draft.lastName}
              </p>
              <p className="text-xs text-slate-500">
                {entry.linkedTo
                  ? t.willLinkTo(entry.linkedName ?? "")
                  : entry.draft.birthDate
                    ? t.bornOn(formatDate(entry.draft.birthDate))
                    : t.newToTree}
                {entry.adoption ? ` · ${entry.adoption}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onJump(
                  jumpMap[label] ??
                    (label.startsWith(t.parentN(1).split(" ")[0])
                      ? 2
                      : label.startsWith(t.childN(1).split(" ")[0])
                        ? 4
                        : 5)
                )
              }
              className="shrink-0 text-sm font-medium text-emerald-700 underline"
            >
              {t.change}
            </button>
          </div>
        ))}
    </div>
  );
}
