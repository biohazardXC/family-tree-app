import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { PersonDTO, TreeData } from "./types";

export const NODE_W = 216;
export const NODE_H = 96;

export type PersonNodeData = { person: PersonDTO; adopted?: boolean };

/**
 * Lays out the whole family tree.
 *
 * Rather than joining parents straight to children, every set of parents gets
 * an invisible "family" point sitting between the two generations. Both
 * parents feed into it and all their children hang off it. That one trick is
 * what keeps a couple together, puts their children centred underneath them,
 * and lets someone with two relationships (say an ex-wife on one side and a
 * current wife on the other) sit between the two without the lines crossing.
 *
 * The family points are dropped before rendering — only people are drawn.
 */
export function layoutTree(data: TreeData): {
  nodes: Node<PersonNodeData>[];
  edges: Edge[];
} {
  const g = new dagre.graphlib.Graph();
  // ranksep is halved because the invisible family point adds a rank of its
  // own between each generation.
  g.setGraph({ rankdir: "TB", nodesep: 42, ranksep: 54, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  const peopleIds = new Set(data.people.map((p) => p.id));
  for (const p of data.people) {
    g.setNode(p.id, { width: NODE_W, height: NODE_H });
  }

  // --- group children by the exact set of parents they have ---
  const parentsOfChild = new Map<string, string[]>();
  for (const e of data.parentEdges) {
    if (!peopleIds.has(e.parentId) || !peopleIds.has(e.childId)) continue;
    if (!parentsOfChild.has(e.childId)) parentsOfChild.set(e.childId, []);
    parentsOfChild.get(e.childId)!.push(e.parentId);
  }

  const familyKey = (parentIds: string[]) => `fam:${[...parentIds].sort().join("+")}`;
  const families = new Map<string, string[]>(); // key -> parent ids

  for (const [, parentIds] of parentsOfChild) {
    families.set(familyKey(parentIds), [...new Set(parentIds)]);
  }

  // Couples with no children still get a point, so they stay side by side.
  for (const s of data.partnerships) {
    if (!peopleIds.has(s.aId) || !peopleIds.has(s.bId)) continue;
    const key = familyKey([s.aId, s.bId]);
    if (!families.has(key)) families.set(key, [s.aId, s.bId]);
  }

  for (const [key, parentIds] of families) {
    g.setNode(key, { width: 1, height: 1 });
    for (const pid of parentIds) {
      // Couples pull harder than single parents, keeping partners adjacent.
      g.setEdge(pid, key, { weight: parentIds.length > 1 ? 3 : 1 });
    }
  }
  for (const [childId, parentIds] of parentsOfChild) {
    g.setEdge(familyKey(parentIds), childId, { weight: 2 });
  }

  dagre.layout(g);

  const adoptedChildIds = new Set(
    data.parentEdges.filter((e) => e.adoption).map((e) => e.childId)
  );

  // Siblings linked without known parents: pull them onto the same row.
  const siblingLinks = data.siblingEdges ?? [];
  const rowOverride = new Map<string, number>();
  for (const link of siblingLinks) {
    const a = g.node(link.aId) as { y: number } | undefined;
    const b = g.node(link.bId) as { y: number } | undefined;
    if (!a || !b) continue;
    const y = Math.max(rowOverride.get(link.aId) ?? a.y, rowOverride.get(link.bId) ?? b.y);
    rowOverride.set(link.aId, y);
    rowOverride.set(link.bId, y);
  }

  // ------------------------------------------------------------------
  // Horizontal placement.
  //
  // dagre decides which generation everyone belongs to, and that part it does
  // well. Left-to-right order is ours to fix: we go down the tree one
  // generation at a time, put each person near the middle of their parents,
  // keep couples and siblings touching, then space the row out so nothing
  // overlaps.
  // ------------------------------------------------------------------
  const H_GAP = 42;
  const place = new Map<string, { x: number; y: number }>();
  for (const p of data.people) {
    const node = g.node(p.id) as { x: number; y: number } | undefined;
    if (!node) continue;
    place.set(p.id, { x: node.x, y: rowOverride.get(p.id) ?? node.y });
  }

  // Who must stay next to whom, within one generation.
  const sideBySide = new Map<string, Set<string>>();
  const pairUp = (a: string, b: string) => {
    if (!place.has(a) || !place.has(b)) return;
    if (place.get(a)!.y !== place.get(b)!.y) return;
    if (!sideBySide.has(a)) sideBySide.set(a, new Set());
    if (!sideBySide.has(b)) sideBySide.set(b, new Set());
    sideBySide.get(a)!.add(b);
    sideBySide.get(b)!.add(a);
  };
  for (const s of data.partnerships) pairUp(s.aId, s.bId);
  for (const link of siblingLinks) pairUp(link.aId, link.bId);

  const rows = [...new Set([...place.values()].map((v) => v.y))].sort((a, b) => a - b);

  for (const y of rows) {
    const ids = [...place.keys()].filter((id) => place.get(id)!.y === y);

    // Where would each person ideally sit? Under their parents if we've
    // already placed them, otherwise wherever dagre had them.
    const anchorOf = new Map<string, number>();
    for (const id of ids) {
      const parents = (parentsOfChild.get(id) ?? []).filter((pid) => {
        const pp = place.get(pid);
        return pp && pp.y < y;
      });
      anchorOf.set(
        id,
        parents.length > 0
          ? parents.reduce((sum, pid) => sum + place.get(pid)!.x, 0) / parents.length
          : place.get(id)!.x
      );
    }

    // Order the row by that ideal, then pull partners/siblings together.
    const sorted = [...ids].sort((a, b) => anchorOf.get(a)! - anchorOf.get(b)!);
    const ordered: string[] = [];
    const done = new Set<string>();

    for (const seed of sorted) {
      if (done.has(seed)) continue;

      // Collect everyone joined to this person by marriage or sibling link.
      const group: string[] = [];
      const inGroup = new Set<string>([seed]);
      const stack = [seed];
      while (stack.length > 0) {
        const cur = stack.pop()!;
        group.push(cur);
        for (const n of sideBySide.get(cur) ?? []) {
          if (!inGroup.has(n) && place.has(n) && place.get(n)!.y === y) {
            inGroup.add(n);
            stack.push(n);
          }
        }
      }

      // Walk the group as a chain starting from one of its ends, so someone
      // with two partners (an ex and a current spouse) ends up in the middle
      // rather than off to one side.
      const start =
        [...group].sort(
          (a, b) =>
            (sideBySide.get(a)?.size ?? 0) - (sideBySide.get(b)?.size ?? 0) ||
            anchorOf.get(a)! - anchorOf.get(b)!
        )[0] ?? seed;

      const walk = (id: string) => {
        if (done.has(id)) return;
        done.add(id);
        ordered.push(id);
        const next = [...(sideBySide.get(id) ?? [])]
          .filter((n) => !done.has(n) && inGroup.has(n))
          .sort(
            (a, b) =>
              (sideBySide.get(a)?.size ?? 0) - (sideBySide.get(b)?.size ?? 0) ||
              anchorOf.get(a)! - anchorOf.get(b)!
          );
        // Follow the branch that dead-ends last, keeping the chain unbroken.
        for (const n of next.reverse()) walk(n);
      };
      walk(start);
    }

    // Space them out left to right, never closer than one card plus a gap.
    const step = NODE_W + H_GAP;
    const xs: number[] = [];
    for (let i = 0; i < ordered.length; i++) {
      const want = anchorOf.get(ordered[i])!;
      xs.push(i === 0 ? want : Math.max(want, xs[i - 1] + step));
    }
    // Nudge the row back so it stays centred under the parents above.
    const wantedCentre =
      ordered.reduce((sum, id) => sum + anchorOf.get(id)!, 0) / ordered.length;
    const actualCentre = xs.reduce((a, b) => a + b, 0) / xs.length;
    const shift = wantedCentre - actualCentre;
    ordered.forEach((id, i) => {
      place.get(id)!.x = xs[i] + shift;
    });
  }

  const nodes: Node<PersonNodeData>[] = data.people.map((p) => {
    const fallback = g.node(p.id) as { x: number; y: number };
    const pos = place.get(p.id) ?? { x: fallback.x, y: fallback.y };
    return {
      id: p.id,
      type: "person",
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      data: { person: p, adopted: adoptedChildIds.has(p.id) },
    };
  });

  const edges: Edge[] = [];

  for (const e of data.parentEdges) {
    edges.push({
      id: `parent-${e.id}`,
      source: e.parentId,
      target: e.childId,
      sourceHandle: "s-bottom",
      targetHandle: "t-top",
      type: "smoothstep",
      style: {
        stroke: "#94a3b8",
        strokeWidth: 1.8,
        strokeDasharray: e.adoption ? "5 4" : undefined,
      },
    });
  }

  for (const link of siblingLinks) {
    edges.push({
      id: `sibling-${link.id}`,
      source: link.aId,
      target: link.bId,
      sourceHandle: "s-right",
      targetHandle: "t-left",
      type: "smoothstep",
      label: "siblings",
      labelStyle: { fill: "#0f766e", fontSize: 10 },
      style: { stroke: "#14b8a6", strokeWidth: 2, strokeDasharray: "4 4" },
    });
  }

  for (const s of data.partnerships) {
    edges.push({
      id: `partner-${s.id}`,
      source: s.aId,
      target: s.bId,
      sourceHandle: "s-right",
      targetHandle: "t-left",
      type: "straight",
      style: {
        stroke: "#fb7185",
        strokeWidth: 2.2,
        strokeDasharray: s.status === "divorced" ? "6 5" : undefined,
      },
    });
  }

  return { nodes, edges };
}
