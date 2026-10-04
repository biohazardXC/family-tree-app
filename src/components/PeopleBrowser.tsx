"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PersonDTO, TreeData } from "@/lib/types";
import { fullName, initials, lifespan } from "@/lib/person-utils";

const AVATAR: Record<string, string> = {
  male: "bg-sky-100 text-sky-700",
  female: "bg-rose-100 text-rose-700",
  other: "bg-slate-200 text-slate-700",
};

export default function PeopleBrowser() {
  const [people, setPeople] = useState<PersonDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/tree", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`The server replied ${r.status}`);
        return r.json() as Promise<TreeData>;
      })
      .then((t) => setPeople(t.people))
      .catch((e) => setError(e instanceof Error ? e.message : "Something went wrong"));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!people) return [];
    if (!q) return people;
    return people.filter((p) =>
      [p.firstName, p.lastName, p.maidenName]
        .filter(Boolean)
        .some((n) => (n as string).toLowerCase().includes(q))
    );
  }, [people, query]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">People</h1>
          <p className="mt-1 text-sm text-slate-500">
            {people ? `${people.length} ${people.length === 1 ? "person" : "people"} in the tree` : "…"}
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-56 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      {error && <p className="mt-8 text-sm text-rose-600">😓 {error}</p>}
      {!error && people === null && (
        <p className="mt-8 text-sm text-slate-400">Loading…</p>
      )}
      {!error && people !== null && filtered.length === 0 && (
        <p className="mt-8 text-sm text-slate-400">
          No one here yet — add people from the{" "}
          <Link href="/" className="font-medium text-emerald-700 hover:underline">
            tree page
          </Link>
          .
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300"
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                AVATAR[p.gender ?? "other"] ?? AVATAR.other
              }`}
            >
              {initials(p)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{fullName(p)}</div>
              {p.maidenName && (
                <div className="truncate text-[11px] italic text-slate-400">née {p.maidenName}</div>
              )}
              <div className="text-[11px] text-slate-500">
                {[lifespan(p), p.birthPlace].filter(Boolean).join(" · ") || "details unknown"}
              </div>
            </div>
            <Link
              href={`/?focus=${p.id}`}
              className="shrink-0 text-xs font-medium text-emerald-700 hover:underline"
            >
              View in tree →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
