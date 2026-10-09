"use client";

import { useEffect, useState } from "react";
import type { PersonDTO, RelationType } from "@/lib/types";
import { fullName, initials, lifespan } from "@/lib/person-utils";
import { formatDate } from "@/lib/dates";
import DateField from "./DateField";
import PhotoField from "./PhotoField";
import type { PersonRelations } from "@/lib/relations";

interface Props {
  person: PersonDTO;
  relations: PersonRelations;
  onClose: () => void;
  onAddRelative: (type: RelationType) => void;
  onSaved: () => Promise<void> | void;
  onDeleted: () => Promise<void> | void;
}

const AVATAR: Record<string, string> = {
  male: "bg-sky-100 text-sky-700",
  female: "bg-rose-100 text-rose-700",
  other: "bg-slate-200 text-slate-700",
};

const RELATION_BUTTONS: [RelationType, string][] = [
  ["partner", "Partner"],
  ["child", "Child"],
  ["parent", "Parent"],
  ["sibling", "Sibling"],
];

function fieldsFrom(p: PersonDTO) {
  return {
    firstName: p.firstName,
    lastName: p.lastName ?? "",
    maidenName: p.maidenName ?? "",
    gender: p.gender ?? "",
    birthDate: p.birthDate ?? "",
    birthPlace: p.birthPlace ?? "",
    deathDate: p.deathDate ?? "",
    deathPlace: p.deathPlace ?? "",
    notes: p.notes ?? "",
    photoUrl: p.photoUrl ?? "",
  };
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-3 text-sm">
      <dt className="w-14 shrink-0 text-slate-400">{label}</dt>
      <dd className="whitespace-pre-wrap text-slate-700">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

export default function PersonPanel({ person, relations, onClose, onAddRelative, onSaved, onDeleted }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(fieldsFrom(person));

  useEffect(() => {
    setForm(fieldsFrom(person));
    setEditing(false);
    setError(null);
  }, [person]);

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) {
      setError("Please give a first name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/people/${person.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Could not save");
      setEditing(false);
      await onSaved();
    } catch {
      setError("Could not save — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = window.confirm(
      `Remove ${fullName(person)} from the tree? Their connections will be removed too.`
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await fetch(`/api/people/${person.id}`, { method: "DELETE" });
      await onDeleted();
    } finally {
      setDeleting(false);
    }
  };

  const avatar = AVATAR[person.gender ?? "other"] ?? AVATAR.other;

  return (
    <aside className="absolute right-0 top-0 z-30 flex h-full w-[22rem] max-w-[90vw] flex-col border-l border-slate-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-base font-semibold ${
              person.photoUrl ? "bg-slate-100" : avatar
            }`}
          >
            {person.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={person.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(person)
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold leading-tight">{fullName(person)}</h2>
            {person.maidenName && (
              <p className="text-xs italic text-slate-400">née {person.maidenName}</p>
            )}
            <p className="text-xs text-slate-500">{lifespan(person) || "dates unknown"}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      {editing ? (
        <form onSubmit={save} className="flex-1 space-y-3 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 block text-xs font-medium text-slate-500">
              First name *
              <input className={`mt-1 ${inputClass}`} value={form.firstName} onChange={set("firstName")} />
            </label>
            <label className="block text-xs font-medium text-slate-500">
              Last name
              <input className={`mt-1 ${inputClass}`} value={form.lastName} onChange={set("lastName")} />
            </label>
            <label className="block text-xs font-medium text-slate-500">
              Maiden name
              <input className={`mt-1 ${inputClass}`} value={form.maidenName} onChange={set("maidenName")} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Photo</span>
              <div className="mt-1">
                <PhotoField
                  value={form.photoUrl}
                  onChange={(url) => setForm((f) => ({ ...f, photoUrl: url }))}
                  placeholder={initials(person)}
                />
              </div>
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
            <div className="col-span-2">
              <DateField
                label="Date of birth"
                value={form.birthDate}
                onChange={(v) => setForm((f) => ({ ...f, birthDate: v }))}
              />
            </div>
            <label className="col-span-2 block text-xs font-medium text-slate-500">
              Birth place
              <input
                className={`mt-1 ${inputClass}`}
                placeholder="e.g. Kroonstad"
                value={form.birthPlace}
                onChange={set("birthPlace")}
              />
            </label>
            <div className="col-span-2">
              <DateField
                label="Date of death"
                value={form.deathDate}
                onChange={(v) => setForm((f) => ({ ...f, deathDate: v }))}
              />
            </div>
            <label className="block text-xs font-medium text-slate-500">
              Death place
              <input className={`mt-1 ${inputClass}`} value={form.deathPlace} onChange={set("deathPlace")} />
            </label>
            <label className="col-span-2 block text-xs font-medium text-slate-500">
              Notes
              <textarea
                className={`mt-1 ${inputClass} min-h-24`}
                placeholder="Their story, in a few lines…"
                value={form.notes}
                onChange={set("notes")}
              />
            </label>
          </div>

          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setForm(fieldsFrom(person));
              }}
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex-1 overflow-y-auto p-5">
          <dl className="space-y-3">
            <Row label="Born" value={[formatDate(person.birthDate), person.birthPlace].filter(Boolean).join(" · ")} />
            <Row label="Died" value={[formatDate(person.deathDate), person.deathPlace].filter(Boolean).join(" · ")} />
            <Row
              label="Gender"
              value={
                person.gender
                  ? person.gender.charAt(0).toUpperCase() + person.gender.slice(1)
                  : null
              }
            />
            <Row label="Notes" value={person.notes} />
          </dl>

          {(relations.parents.length > 0 ||
            relations.partners.length > 0 ||
            relations.children.length > 0) && (
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                In the tree
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                {relations.parents.map((p) => (
                  <li key={`p-${p.id}`}>
                    <span className="text-slate-400">Parent:</span> {p.name}
                    {p.adoption && (
                      <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold uppercase text-amber-700">
                        {p.adoption}
                      </span>
                    )}
                  </li>
                ))}
                {relations.partners.map((p) => (
                  <li key={`s-${p.id}`}>
                    <span className="text-slate-400">Partner:</span> {p.name}
                    {p.status && <span className="text-slate-400"> ({p.status})</span>}
                  </li>
                ))}
                {relations.children.map((c) => (
                  <li key={`c-${c.id}`}>
                    <span className="text-slate-400">Child:</span> {c.name}
                    {c.adoption && (
                      <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold uppercase text-amber-700">
                        {c.adoption}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Add a relative
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {RELATION_BUTTONS.map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => onAddRelative(type)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  + {label}
                </button>
              ))}
            </div>
            {person.isDemo && (
              <p className="mt-3 text-[11px] text-slate-400">
                Part of the demo family — edit or remove freely.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 p-4">
        <button
          onClick={() => setEditing(true)}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Edit details
        </button>
        <button
          onClick={remove}
          disabled={deleting}
          className="text-xs font-medium text-rose-500 hover:text-rose-700 disabled:opacity-50"
        >
          {deleting ? "Removing…" : "Remove person"}
        </button>
      </div>
    </aside>
  );
}
