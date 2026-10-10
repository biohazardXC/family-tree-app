"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import PersonPanel from "./PersonPanel";
import AddRelativeModal, { type ModalKind } from "./AddRelativeModal";
import { layoutTree } from "@/lib/layout";
import { summarizeRelations } from "@/lib/relations";
import { fullName, lifespan } from "@/lib/person-utils";
import type { PersonDTO, RelationType, TreeData } from "@/lib/types";

const nodeTypes: NodeTypes = { person: PersonNode };

function miniMapColor(node: Node): string {
  const gender = (node.data as { person?: PersonDTO } | undefined)?.person?.gender;
  return gender === "male" ? "#bae6fd" : gender === "female" ? "#fbcfe8" : "#e2e8f0";
}

function TreeCanvas() {
  const instance = useReactFlow();

  const [data, setData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ kind: ModalKind; anchor: PersonDTO | null } | null>(null);
  const [query, setQuery] = useState("");
  const [busyDemo, setBusyDemo] = useState(false);

  const didInitialFit = useRef(false);

  const fetchTree = useCallback(async (): Promise<TreeData | null> => {
    try {
      setError(null);
      const res = await fetch("/api/tree", { cache: "no-store" });
      if (!res.ok) throw new Error(`The server replied ${res.status}`);
      const tree = (await res.json()) as TreeData;
      setData(tree);
      return tree;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTree();
  }, [fetchTree]);

  const { nodes, edges } = useMemo(
    () => (data ? layoutTree(data) : { nodes: [] as Node[], edges: [] as Edge[] }),
    [data]
  );

  const selectedPerson = useMemo(
    () => data?.people.find((p) => p.id === selectedId) ?? null,
    [data, selectedId]
  );

  const selectedRelations = useMemo(
    () => (selectedPerson && data ? summarizeRelations(selectedPerson.id, data) : null),
    [selectedPerson, data]
  );

  const focusPerson = useCallback(
    (id: string) => {
      setSelectedId(id);
      void instance.fitView({ nodes: [{ id }], duration: 600, maxZoom: 1.1 });
    },
    [instance]
  );

  // First load: fit the whole tree in view; support /?focus=<id> deep links.
  useEffect(() => {
    if (!data || loading || didInitialFit.current) return;
    if (data.people.length === 0) {
      didInitialFit.current = true;
      return;
    }
    didInitialFit.current = true;
    const focus =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("focus") : null;
    const timer = setTimeout(() => {
      if (focus && data.people.some((p) => p.id === focus)) {
        focusPerson(focus);
      } else {
        void instance.fitView({ padding: 0.2, duration: 300 });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [data, loading, instance, focusPerson]);

  const openModal = (kind: ModalKind, anchor: PersonDTO | null) => setModal({ kind, anchor });

  const handleCreated = useCallback(
    async (person: PersonDTO) => {
      setModal(null);
      await fetchTree();
      focusPerson(person.id);
    },
    [fetchTree, focusPerson]
  );

  const handleSaved = useCallback(async () => {
    await fetchTree();
  }, [fetchTree]);

  const handleDeleted = useCallback(async () => {
    setSelectedId(null);
    await fetchTree();
  }, [fetchTree]);

  const demoAction = async (action: "clear" | "reseed" | "wipe") => {
    if (action === "reseed") {
      const ok = window.confirm("This removes everyone (including your own additions) and restores the demo family. Continue?");
      if (!ok) return;
    }
    if (action === "wipe") {
      const count = data?.people.length ?? 0;
      const ok = window.confirm(
        `This permanently deletes all ${count} people and every link between them, ` +
          "leaving a completely empty tree. Photos and invite links are kept. " +
          "This cannot be undone. Continue?"
      );
      if (!ok) return;
      if (!window.confirm("Really delete everyone? There is no undo.")) return;
    }
    setBusyDemo(true);
    try {
      await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setSelectedId(null);
      await fetchTree();
    } finally {
      setBusyDemo(false);
    }
  };

  const hasDemoPeople = data?.people.some((p) => p.isDemo) ?? false;
  const isEmpty = (data?.people.length ?? 0) === 0;

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!data || q.length === 0) return [];
    return data.people
      .filter((p) =>
        [p.firstName, p.lastName, p.maidenName]
          .filter(Boolean)
          .some((n) => (n as string).toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [data, query]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-slate-400">
        Loading your tree…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3 text-sm text-slate-500">
        <p>😓 {error}</p>
        <button
          onClick={() => void fetchTree()}
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Try again
        </button>
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

      {/* Search */}
      <div className="absolute left-1/2 top-4 z-20 w-72 -translate-x-1/2 sm:w-80">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people…"
          className="w-full rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-sm shadow-md outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
        />
        {query.trim() && (
          <ul className="mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {searchResults.length === 0 ? (
              <li className="px-4 py-2 text-sm text-slate-400">No matches</li>
            ) : (
              searchResults.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      setQuery("");
                      focusPerson(p.id);
                    }}
                    className="flex w-full items-baseline justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-emerald-50"
                  >
                    <span className="truncate font-medium text-slate-700">{fullName(p)}</span>
                    <span className="shrink-0 text-xs text-slate-400">{lifespan(p)}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Add person */}
      <div className="absolute left-4 top-4 z-20">
        <button
          onClick={() => openModal("root", null)}
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-emerald-700"
        >
          + Add person
        </button>
      </div>

      {/* Demo banner */}
      {hasDemoPeople ? (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50/95 px-4 py-2 text-xs shadow-md">
          <span className="font-medium text-amber-800">
            Demo family — try everything out, then start fresh
          </span>
          <button
            onClick={() => void demoAction("clear")}
            disabled={busyDemo}
            className="rounded-full bg-amber-600 px-3 py-1 font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Start fresh
          </button>
          <button
            onClick={() => void demoAction("reseed")}
            disabled={busyDemo}
            className="rounded-full border border-amber-300 px-3 py-1 font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
          >
            Reset demo
          </button>
        </div>
      ) : (
        !isEmpty && (
          /* Clearing the tree used to be possible only while demo people
             existed — that is, only when it wasn't needed. This is reachable
             whenever there is something to clear, and it is behind the admin
             password and two confirmations. */
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs shadow-md">
            <span className="text-slate-400">{data?.people.length} people in your tree</span>
            <button
              onClick={() => void demoAction("wipe")}
              disabled={busyDemo}
              className="rounded-full border border-rose-200 px-3 py-1 font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              {busyDemo ? "Working…" : "Delete everyone"}
            </button>
          </div>
        )
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/80 p-4">
          <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
            <div className="text-4xl">🌱</div>
            <h2 className="mt-3 text-lg font-semibold">Your tree starts with one person</h2>
            <p className="mt-2 text-sm text-slate-500">
              Add yourself, a parent or a grandparent — you can grow in every direction from there.
            </p>
            <button
              onClick={() => openModal("root", null)}
              className="mt-5 rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Add the first person
            </button>
          </div>
        </div>
      )}

      {/* Side panel */}
      {selectedPerson && selectedRelations && (
        <PersonPanel
          person={selectedPerson}
          relations={selectedRelations}
          onClose={() => setSelectedId(null)}
          onAddRelative={(type: RelationType) => openModal(type, selectedPerson)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      {/* Modal */}
      {modal && (
        <AddRelativeModal
          kind={modal.kind}
          anchor={modal.anchor}
          onClose={() => setModal(null)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

export default function TreeWorkspace() {
  return (
    <ReactFlowProvider>
      <TreeCanvas />
    </ReactFlowProvider>
  );
}
