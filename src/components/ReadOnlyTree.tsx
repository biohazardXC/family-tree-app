"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import PersonNode from "./PersonNode";
import { layoutTree } from "@/lib/layout";
import { summarizeRelations } from "@/lib/relations";
import { fullName, initials, lifespan, yearFromString } from "@/lib/person-utils";
import { formatDate } from "@/lib/dates";
import type { PersonDTO, TreeData } from "@/lib/types";

const nodeTypes: NodeTypes = { person: PersonNode };

function miniMapColor(node: Node): string {
  const gender = (node.data as { person?: PersonDTO } | undefined)?.person?.gender;
  return gender === "male" ? "#bae6fd" : gender === "female" ? "#fbcfe8" : "#e2e8f0";
}

/** A look-but-don't-touch tree for invitees. */
function Canvas() {
  const instance = useReactFlow();
  const [data, setData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tree", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`The server replied ${r.status}`);
        return r.json() as Promise<TreeData>;
      })
      .then((t) => {
        setData(t);
        setTimeout(() => void instance.fitView({ padding: 0.2, duration: 300 }), 80);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Something went wrong"))
      .finally(() => setLoading(false));
  }, [instance]);

  const { nodes, edges } = useMemo(
    () => (data ? layoutTree(data) : { nodes: [] as Node[], edges: [] as Edge[] }),
    [data]
  );

  const selected = useMemo(
    () => data?.people.find((p) => p.id === selectedId) ?? null,
    [data, selectedId]
  );
  const selectedRelations = useMemo(
    () => (selected && data ? summarizeRelations(selected.id, data) : null),
    [selected, data]
  );

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-slate-400">
        Loading the family tree…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-slate-500">
        😓 {error}
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-3.5rem)] w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => setSelectedId(node.id)}
        onPaneClick={() => setSelectedId(null)}
        minZoom={0.15}
        maxZoom={2}
        nodesConnectable={false}
        nodesDraggable={false}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={26} size={1.6} color="#dbe3ec" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeColor={miniMapColor} className="!bg-white" />
      </ReactFlow>

      {selected && selectedRelations && (
        <aside className="absolute bottom-0 right-0 z-30 flex max-h-[60vh] w-full flex-col overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl sm:bottom-0 sm:top-0 sm:h-full sm:max-h-none sm:w-[22rem] sm:rounded-t-none sm:border-l sm:border-t-0">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h2 className="text-lg font-bold">{fullName(selected)}</h2>
              {selected.maidenName && (
                <p className="text-xs italic text-slate-400">née {selected.maidenName}</p>
              )}
              <p className="text-sm text-slate-500">{lifespan(selected) || "dates unknown"}</p>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              aria-label="Close"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3 p-5 text-sm">
            <Info label="Born" value={[formatDate(selected.birthDate), selected.birthPlace].filter(Boolean).join(" · ")} />
            <Info label="Died" value={[formatDate(selected.deathDate), selected.deathPlace].filter(Boolean).join(" · ")} />
            {selected.notes && <Info label="Notes" value={selected.notes} />}

            {(selectedRelations.parents.length > 0 ||
              selectedRelations.partners.length > 0 ||
              selectedRelations.children.length > 0) && (
              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  In the tree
                </h3>
                <ul className="mt-2 space-y-1.5 text-slate-700">
                  {selectedRelations.parents.map((p) => (
                    <li key={`p-${p.id}`}>
                      <span className="text-slate-400">Parent:</span> {p.name}
                      {p.adoption && (
                        <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold uppercase text-amber-700">
                          {p.adoption}
                        </span>
                      )}
                    </li>
                  ))}
                  {selectedRelations.partners.map((p) => (
                    <li key={`s-${p.id}`}>
                      <span className="text-slate-400">Partner:</span> {p.name}
                      {p.status && <span className="text-slate-400"> ({p.status})</span>}
                    </li>
                  ))}
                  {selectedRelations.children.map((c) => (
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
          </div>
        </aside>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="w-14 shrink-0 text-slate-400">{label}</span>
      <span className="whitespace-pre-wrap">{value}</span>
    </div>
  );
}

export default function ReadOnlyTree() {
  return (
    <ReactFlowProvider>
      <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2">
        <span className="rounded-full bg-slate-800/85 px-3 py-1 text-xs font-medium text-white shadow">
          View only — nothing here can be changed
        </span>
      </div>
      <Canvas />
    </ReactFlowProvider>
  );
}
