"use client";

import { useEffect, useRef, useState } from "react";
import type { MatchResult, PersonDTO, RelationType } from "@/lib/types";
import { fullName } from "@/lib/person-utils";

export type ModalKind = RelationType | "root";

interface Props {
  kind: ModalKind;
  anchor: PersonDTO | null;
  onClose: () => void;
  onCreated: (person: PersonDTO) => void | Promise<void>;
}

const TITLES: Record<ModalKind, string> = {
  root: "Add a person",
  partner: "Add a partner",
  child: "Add a child",
  parent: "Add a parent",
  sibling: "Add a sibling",
};

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

export default function AddRelativeModal({ kind, anchor, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    maidenName: "",
    gender: "",
    birthDate: "",
    birthPlace: "",
    deathDate: "",
    deathPlace: "",
    notes: "",
  });
  const [partnershipStatus, setPartnershipStatus] = useState("married");
  const [adoption, setAdoption] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "Is this someone we already have?" — same fuzzy matcher the invite form uses.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (form.firstName.trim().length < 2) {
      setMatches([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName || null,
            birthDate: form.birthDate || null,
          }),
        });
        const j = (await res.json()) as { matches?: MatchResult[] };
        setMatches(
          (j.matches ?? []).filter(
            (m) => m.person.id !== anchor?.id && !dismissed.includes(m.person.id)
          )
        );
      } catch {
        setMatches([]);
      }
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [form.firstName, form.lastName, form.birthDate, anchor?.id, dismissed]);

  /** Connect an existing person instead of creating a duplicate. */
  const linkExisting = async (person: PersonDTO) => {
    if (!anchor || kind === "root") return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/relations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: kind,
          toId: anchor.id,
          personId: person.id,
          ...(kind === "partner" ? { partnershipStatus } : {}),
          ...(kind === "child" && adoption ? { adoption } : {}),
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "Could not connect them");
      }
      await onCreated((await res.json()) as PersonDTO);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect them — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const context =
    anchor && kind !== "root"
      ? kind === "partner"
        ? `Partner of ${fullName(anchor)}`
        : kind === "child"
          ? `Child of ${fullName(anchor)}`
          : kind === "parent"
            ? `Parent of ${fullName(anchor)}`
            : `Sibling of ${fullName(anchor)} — shares the same parents`
      : "A new, unconnected person — you can link them later";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) {
      setError("Please give a first name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        ...form,
        gender: form.gender || null,
      };
      if (anchor && kind !== "root") {
        body.relation = {
          type: kind,
          toId: anchor.id,
          ...(kind === "partner" ? { partnershipStatus } : {}),
          ...(kind === "child" && adoption ? { adoption } : {}),
        };
      }
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "Could not save");
      }
      const person = (await res.json()) as PersonDTO;
      await onCreated(person);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 className="text-lg font-semibold">{TITLES[kind]}</h2>
        <p className="mt-1 text-xs text-slate-500">{context}</p>

        {matches.length > 0 && anchor && kind !== "root" && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-900">
              Already in the tree? Pick someone to connect instead of adding a duplicate.
            </p>
            <ul className="mt-2 space-y-2">
              {matches.map((m) => (
                <li key={m.person.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-700">
                    {fullName(m.person)}
                    {m.person.birthDate ? (
                      <span className="text-slate-400"> · b. {m.person.birthDate}</span>
                    ) : null}
                    {m.confidence === "likely" ? (
                      <span className="ml-1 text-xs text-amber-700">likely match</span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => linkExisting(m.person)}
                      className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                    >
                      That&apos;s them
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissed((d) => [...d, m.person.id])}
                      className="rounded-lg border border-amber-300 px-2.5 py-1 text-xs text-amber-800"
                    >
                      No
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-2 block text-xs font-medium text-slate-500">
            First name *
            <input className={`mt-1 ${inputClass}`} value={form.firstName} onChange={set("firstName")} autoFocus />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            Last name
            <input className={`mt-1 ${inputClass}`} value={form.lastName} onChange={set("lastName")} />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            Maiden name
            <input className={`mt-1 ${inputClass}`} value={form.maidenName} onChange={set("maidenName")} />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            Gender
            <select className={`mt-1 ${inputClass}`} value={form.gender} onChange={set("gender")}>
              <option value="">Not specified</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-500">
            Birth date
            <input
              className={`mt-1 ${inputClass}`}
              placeholder="e.g. 1945 or March 1948"
              value={form.birthDate}
              onChange={set("birthDate")}
            />
          </label>
          <label className="col-span-2 block text-xs font-medium text-slate-500">
            Birth place
            <input
              className={`mt-1 ${inputClass}`}
              placeholder="e.g. Johannesburg"
              value={form.birthPlace}
              onChange={set("birthPlace")}
            />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            Death date
            <input className={`mt-1 ${inputClass}`} value={form.deathDate} onChange={set("deathDate")} />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            Death place
            <input className={`mt-1 ${inputClass}`} value={form.deathPlace} onChange={set("deathPlace")} />
          </label>

          {kind === "partner" && (
            <label className="col-span-2 block text-xs font-medium text-slate-500">
              Relationship
              <select
                className={`mt-1 ${inputClass}`}
                value={partnershipStatus}
                onChange={(e) => setPartnershipStatus(e.target.value)}
              >
                <option value="married">Married</option>
                <option value="partners">Partners</option>
                <option value="engaged">Engaged</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </label>
          )}

          {kind === "child" && (
            <label className="col-span-2 block text-xs font-medium text-slate-500">
              How did they join the family?
              <select
                className={`mt-1 ${inputClass}`}
                value={adoption}
                onChange={(e) => setAdoption(e.target.value)}
              >
                <option value="">Biological child</option>
                <option value="adopted">Adopted</option>
                <option value="step">Step-child</option>
                <option value="foster">Foster child</option>
              </select>
            </label>
          )}

          <label className="col-span-2 block text-xs font-medium text-slate-500">
            Notes
            <textarea
              className={`mt-1 ${inputClass} min-h-20`}
              placeholder="Anything worth remembering about them…"
              value={form.notes}
              onChange={set("notes")}
            />
          </label>
        </div>

        {error && <p className="mt-3 text-xs font-medium text-rose-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add to tree"}
          </button>
        </div>
      </form>
    </div>
  );
}
