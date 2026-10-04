"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { PersonDTO } from "@/lib/types";
import { fullName, initials, lifespan } from "@/lib/person-utils";

export type PersonNodeType = Node<{ person: PersonDTO }, "person">;

const AVATAR_STYLES: Record<string, string> = {
  male: "bg-sky-100 text-sky-700",
  female: "bg-rose-100 text-rose-700",
  other: "bg-slate-200 text-slate-700",
};

export default function PersonNode({ data, selected }: NodeProps<PersonNodeType>) {
  const p = data.person;
  const avatar = AVATAR_STYLES[p.gender ?? "other"] ?? AVATAR_STYLES.other;
  const deceased = Boolean(p.deathDate);

  return (
    <div
      className={`flex h-[96px] w-[216px] items-center gap-3 rounded-xl border bg-white px-3 shadow-sm transition ${
        selected
          ? "border-emerald-500 ring-2 ring-emerald-200"
          : "border-slate-200 hover:border-emerald-300"
      }`}
    >
      {/* Handles are invisible connection points for the lines */}
      <Handle id="t-top" type="target" position={Position.Top} className="!invisible" isConnectable={false} />
      <Handle id="s-bottom" type="source" position={Position.Bottom} className="!invisible" isConnectable={false} />
      <Handle id="t-left" type="target" position={Position.Left} className="!invisible" isConnectable={false} />
      <Handle id="s-right" type="source" position={Position.Right} className="!invisible" isConnectable={false} />

      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatar}`}
      >
        {initials(p)}
      </div>

      <div className="min-w-0">
        <div
          className={`truncate text-sm font-semibold ${deceased ? "text-slate-600" : "text-slate-900"}`}
        >
          {fullName(p)}
        </div>
        {p.maidenName && (
          <div className="truncate text-[11px] italic text-slate-400">née {p.maidenName}</div>
        )}
        <div className="text-[11px] text-slate-500">{lifespan(p) || "dates unknown"}</div>
      </div>
    </div>
  );
}
