"use client";

import { useState } from "react";
import type { PersonDTO, RelationType } from "@/lib/types";
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
