"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { InviteDTO, MatchResult, PersonGaps, SubmissionItem } from "@/lib/types";
import { fullName, lifespan } from "@/lib/person-utils";

/**
 * The admin's command centre: invites, incoming submissions, and
 * missing/conflicting information across the tree.
 */

type Tab = "submissions" | "invites" | "gaps";

interface SubmissionSummary {
  id: string;
  status: string;
  inviteName: string;
  itemCount: number;
  createdAt: string;
  decidedAt: string | null;
}

interface ItemWithMatches extends SubmissionItem {
  matches: MatchResult[];
}

interface SubmissionDetailData {
  id: string;
  status: string;
  inviteName: string;
  createdAt: string;
  items: ItemWithMatches[];
}

const ROLE_LABEL: Record<string, string> = {
  self: "Themselves",
  spouse: "Partner",
  parent: "Parent",
  child: "Child",
  sibling: "Sibling",
};

const CONFLICT_FIELDS: { key: keyof SubmissionItem["person"]; label: string }[] = [
  { key: "lastName", label: "Surname" },
  { key: "maidenName", label: "Maiden name" },
  { key: "birthDate", label: "Birth date" },
  { key: "birthPlace", label: "Birth place" },
  { key: "deathDate", label: "Death date" },
  { key: "deathPlace", label: "Death place" },
  { key: "notes", label: "Notes" },
];

export default function ReviewHome() {
  const [tab, setTab] = useState<Tab>("submissions");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Review</h1>
      <p className="mt-1 text-sm text-slate-500">
        Invites, incoming family submissions, and information gaps in your tree.
      </p>

      <div className="mt-6 flex gap-1 rounded-xl bg-slate-100 p-1 text-sm font-medium">
        {(
          [
            ["submissions", "📥 Submissions"],
            ["invites", "🔗 Invites"],
            ["gaps", "🔎 Gaps"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2 ${
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "submissions" && <SubmissionsTab />}
        {tab === "invites" && <InvitesTab />}
        {tab === "gaps" && <GapsTab />}
      </div>
    </div>
  );
}

// ================= SUBMISSIONS =================

function SubmissionsTab() {
  const [list, setList] = useState<SubmissionSummary[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/submissions", { cache: "no-store" })
      .then((r) => r.json() as Promise<SubmissionSummary[]>)
      .then(setList)
      .catch(() => setList([]));
  }, []);

  useEffect(load, [load]);

  if (openId) {
    return <SubmissionDetail id={openId} onBack={() => { setOpenId(null); load(); }} />;
  }

  if (list === null) return <p className="text-sm text-slate-400">Loading…</p>;

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <div className="text-3xl">📭</div>
        <p className="mt-3 text-sm text-slate-500">
          No submissions yet. Create an invite link and send it to family — their info will land
          here for your review.
        </p>
      </div>
    );
  }

  const statusChip = (s: string) =>
    s === "approved"
      ? "bg-emerald-100 text-emerald-800"
      : s === "rejected"
        ? "bg-rose-100 text-rose-700"
        : "bg-amber-100 text-amber-800";

  return (
    <div className="space-y-3">
      {list.map((s) => (
        <button
          key={s.id}
          onClick={() => setOpenId(s.id)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-emerald-300"
        >
          <div className="min-w-0">
            <p className="font-semibold text-slate-800">{s.inviteName}</p>
            <p className="text-xs text-slate-500">
              {s.itemCount} {s.itemCount === 1 ? "person" : "people"} ·{" "}
              {new Date(s.createdAt).toLocaleDateString()}{" "}
              {new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusChip(s.status)}`}>
            {s.status}
          </span>
        </button>
      ))}
    </div>
  );
}

interface ItemDecision {
  mode: "create" | "link" | "skip";
  personId?: string;
  fields?: string[];
}

function SubmissionDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [sub, setSub] = useState<SubmissionDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, ItemDecision>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/submissions/${id}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<SubmissionDetailData>)
      .then((d) => {
        setSub(d);
        // default decisions: follow the invitee's own link confirmation, else create
        const initial: Record<string, ItemDecision> = {};
        for (const item of d.items) {
          initial[item.key] =
            item.linkedTo && item.matches.some((m) => m.person.id === item.linkedTo)
              ? { mode: "link", personId: item.linkedTo }
              : { mode: "create" };
        }
        setDecisions(initial);
      })
      .catch(() => setError("Could not load this submission."));
  }, [id]);

  const decide = async (action: "approve" | "reject") => {
    if (!sub) return;
    if (action === "reject" && !window.confirm("Reject this submission? The invitee's info won't be added.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, items: decisions }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "Could not apply the decision.");
      }
      setDone(action);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply the decision.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="text-4xl">{done === "approve" ? "🌳" : "🚫"}</div>
        <h2 className="mt-3 text-lg font-semibold">
          {done === "approve" ? "Approved & added to the tree" : "Submission rejected"}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {done === "approve"
            ? "The new people and connections are live. Linked people were merged with their chosen details."
            : "Nothing was added."}
        </p>
        <button
          onClick={onBack}
          className="mt-5 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Back to submissions
        </button>
      </div>
    );
  }

  if (error && !sub) return <p className="text-sm text-rose-600">{error}</p>;
  if (!sub) return <p className="text-sm text-slate-400">Loading…</p>;

  const pending = sub.status === "submitted";

  return (
    <div>
      <button onClick={onBack} className="text-sm font-medium text-emerald-700 hover:underline">
        ← All submissions
      </button>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">{sub.inviteName}</h2>
          <p className="text-xs text-slate-500">
            {sub.items.length} {sub.items.length === 1 ? "person" : "people"} ·{" "}
            {new Date(sub.createdAt).toLocaleString()} · <span className="capitalize">{sub.status}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {sub.items.map((item) => (
          <ItemCard
            key={item.key}
            item={item}
            decision={decisions[item.key] ?? { mode: "create" }}
            onChange={(d) => setDecisions((prev) => ({ ...prev, [item.key]: d }))}
          />
        ))}
      </div>

      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}

      {pending && (
        <div className="sticky bottom-4 mt-6 flex gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <button
            onClick={() => void decide("approve")}
            disabled={busy}
            className="flex-1 rounded-full bg-emerald-600 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Working…" : "✓ Approve & add to tree"}
          </button>
          <button
            onClick={() => void decide("reject")}
            disabled={busy}
            className="rounded-full border border-rose-200 px-5 py-3 text-base font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

function ItemCard({
  item,
  decision,
  onChange,
}: {
  item: ItemWithMatches;
  decision: ItemDecision;
  onChange: (d: ItemDecision) => void;
}) {
  const p = item.person;
  const selectedPerson = decision.mode === "link" ? item.matches.find((m) => m.person.id === decision.personId) : null;

  const conflicts =
    selectedPerson &&
    CONFLICT_FIELDS.filter(({ key }) => {
      const submitted = (p[key] as string | null | undefined)?.toString().trim();
      const existing = (selectedPerson.person[key as keyof typeof selectedPerson.person] as string | null | undefined)?.toString().trim();
      return (submitted || existing) && submitted !== existing;
    });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            {ROLE_LABEL[item.role] ?? item.role}
            {item.adoption ? ` · ${item.adoption}` : ""}
            {item.role === "spouse" && item.partnershipStatus ? ` · ${item.partnershipStatus}` : ""}
          </p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">
            {p.firstName} {p.lastName ?? ""}
          </p>
          <p className="text-xs text-slate-500">
            {[p.birthDate, p.birthPlace].filter(Boolean).join(" · ") || "no dates given"}
            {p.maidenName ? ` · née ${p.maidenName}` : ""}
          </p>
          {p.notes && <p className="mt-1 text-xs italic text-slate-500">“{p.notes}”</p>}
        </div>
        {item.linkedTo && (
          <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-semibold uppercase text-sky-700">
            invitee confirmed match
          </span>
        )}
      </div>

      {/* What to do with this person */}
      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          What should this be?
        </p>
        <div className="mt-2 space-y-2">
          <Choice
            selected={decision.mode === "create"}
            onClick={() => onChange({ mode: "create" })}
            title="➕ New person"
            subtitle="Add them as a brand-new person in the tree"
          />
          {item.matches.map((m) => (
            <Choice
              key={m.person.id}
              selected={decision.mode === "link" && decision.personId === m.person.id}
              onClick={() => onChange({ mode: "link", personId: m.person.id, fields: [] })}
              title={`🔗 Same as ${fullName(m.person)}`}
              subtitle={`${lifespan(m.person) ? `${lifespan(m.person)} · ` : ""}${m.score}% name match · ${
                m.confidence === "likely" ? "strong" : "possible"
              }`}
              highlight={m.confidence === "likely"}
            />
          ))}
          <Choice
            selected={decision.mode === "skip"}
            onClick={() => onChange({ mode: "skip" })}
            title="⏭ Skip this person"
            subtitle="Don't add them at all"
          />
        </div>
      </div>

      {/* Conflict resolution when linking */}
      {selectedPerson && conflicts && conflicts.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            The details differ — pick what to keep
          </p>
          <div className="mt-2 space-y-3">
            {conflicts.map(({ key, label }) => {
              const submitted = (p[key] as string | null | undefined)?.toString().trim();
              const existing = (
                selectedPerson.person[key as keyof typeof selectedPerson.person] as string | null | undefined
              )?.toString().trim();
              const useSubmitted = (decision.fields ?? []).includes(key as string);
              return (
                <div key={key as string}>
                  <p className="text-xs font-semibold text-slate-600">{label}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...decision,
                          fields: (decision.fields ?? []).filter((f) => f !== key),
                        })
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                        !useSubmitted
                          ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      Keep existing{existing ? `: “${existing}”` : " (empty)"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...decision,
                          fields: [...(decision.fields ?? []), key as string],
                        })
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                        useSubmitted
                          ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      Use submitted{submitted ? `: “${submitted}”` : " (empty)"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Choice({
  selected,
  onClick,
  title,
  subtitle,
  highlight,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left ${
        selected
          ? "border-emerald-500 bg-emerald-50"
          : highlight
            ? "border-amber-300 bg-white hover:border-amber-400"
            : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <span>
        <span className="block text-sm font-semibold text-slate-800">{title}</span>
        <span className="block text-xs text-slate-500">{subtitle}</span>
      </span>
      <span
        className={`h-4 w-4 shrink-0 rounded-full border-2 ${
          selected ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
        }`}
      />
    </button>
  );
}

// ================= INVITES =================

function InvitesTab() {
  const [list, setList] = useState<InviteDTO[] | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [created, setCreated] = useState<{ url: string; path: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/invites", { cache: "no-store" })
      .then((r) => r.json() as Promise<InviteDTO[]>)
      .then(setList)
      .catch(() => setList([]));
  }, []);

  useEffect(load, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, note }),
      });
      const j = (await res.json()) as { url: string; invite: { token: string } };
      setCreated({ url: j.url, path: `/invite/${j.invite.token}`, name: name.trim() });
      setName("");
      setNote("");
      setCopied(false);
      load();
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — user can select the text manually
    }
  };

  const statusChip = (s: string) =>
    s === "submitted"
      ? "bg-emerald-100 text-emerald-800"
      : s === "opened"
        ? "bg-sky-100 text-sky-700"
        : "bg-slate-100 text-slate-600";

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-800">Invite a family member</h2>
        <p className="mt-1 text-xs text-slate-500">
          Creates a personal link — no password needed. Send it via WhatsApp; the link opens their
          simple form.
        </p>
        <div className="mt-4 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Their name (e.g. Aunty Nellie)"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (e.g. sent via WhatsApp 4 Oct)"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create invite link"}
          </button>
        </div>

        {created && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">
              Link for {created.name} — send it to them:
            </p>
            <p className="mt-1 break-all rounded-lg bg-white p-2 font-mono text-xs text-slate-700">
              {created.url}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-emerald-800">
              ⚠ This full link only works once the app is online (see the note below the buttons).
              To test it right now, open it in this preview:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={created.path}
                className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Open the form in this tab →
              </a>
              <button
                type="button"
                onClick={() => void copy(created.url)}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                {copied ? "Copied ✓" : "Copy link"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Hi ${created.name}! Please add your family's details to our family tree: ${created.url}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[#25D366] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
              >
                Share on WhatsApp
              </a>
            </div>
            <p className="mt-2 text-[11px] text-emerald-700">
              Note: while the app runs only in this private preview, the copied/WhatsApp link
              won&apos;t open for anyone else. That changes the moment we put the app online.
            </p>
          </div>
        )}
      </form>

      {list !== null && list.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{inv.name}</span>
                    {inv.note && <span className="block text-xs text-slate-400">{inv.note}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusChip(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() =>
                        void copy(`${window.location.origin}/invite/${inv.token}`)
                      }
                      className="text-xs font-medium text-emerald-700 hover:underline"
                    >
                      Copy link
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ================= GAPS =================

function GapsTab() {
  const [data, setData] = useState<{ counts: { people: number; withGaps: number; totalGaps: number }; people: PersonGaps[] } | null>(null);

  useEffect(() => {
    fetch("/api/gaps", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return <p className="text-sm text-slate-400">Loading…</p>;

  if (data.people.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="text-3xl">✨</div>
        <p className="mt-3 text-sm font-medium text-emerald-900">
          No missing information — every person has dates, places and parents.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
          {data.counts.people} people in tree
        </span>
        <span className="rounded-full bg-amber-100 px-3 py-1.5 font-semibold text-amber-800">
          {data.counts.withGaps} with missing info
        </span>
        <span className="rounded-full bg-amber-100 px-3 py-1.5 font-semibold text-amber-800">
          {data.counts.totalGaps} gaps total
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {data.people.map(({ person, gaps }) => (
          <div
            key={person.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="min-w-0">
              <p className="font-semibold text-slate-800">{fullName(person)}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {gaps.map((g) => (
                  <span
                    key={g.key}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      g.key === "dates-conflict"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {g.key === "dates-conflict" ? "⚠ " : ""}
                    {g.label}
                  </span>
                ))}
              </div>
            </div>
            <Link
              href={`/?focus=${person.id}`}
              className="shrink-0 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
            >
              Fill in on the tree →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
