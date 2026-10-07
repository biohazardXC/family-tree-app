import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { PersonDTO, TreeData } from "./types";

export const NODE_W = 216;
export const NODE_H = 96;

export type PersonNodeData = { person: PersonDTO; adopted?: boolean };

/**
 * Lays out the whole family tree:
 * - dagre stacks generations top-to-bottom using parent -> child links
 * - parent/child edges come out of the bottom of the parent into the top of the child
 * - partner edges are drawn horizontally between the two partners
 */
export function layoutTree(data: TreeData): {
  nodes: Node<PersonNodeData>[];
  edges: Edge[];
} {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 48, ranksep: 110, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const p of data.people) {
    g.setNode(p.id, { width: NODE_W, height: NODE_H });
  }
  for (const e of data.parentEdges) {
    g.setEdge(e.parentId, e.childId);
  }

  // Sibling links with no shared parents: keep the pair on the same row.
  const siblingLinks = data.siblingEdges ?? [];

  dagre.layout(g);

  const adoptedChildIds = new Set(
    data.parentEdges.filter((e) => e.adoption).map((e) => e.childId)
  );

  // Align explicitly-linked siblings vertically so they read as one generation.
  const rowOverride = new Map<string, number>();
  for (const link of siblingLinks) {
    const a = g.node(link.aId) as { y: number } | undefined;
    const b = g.node(link.bId) as { y: number } | undefined;
    if (!a || !b) continue;
    const y = Math.max(rowOverride.get(link.aId) ?? a.y, rowOverride.get(link.bId) ?? b.y);
    rowOverride.set(link.aId, y);
    rowOverride.set(link.bId, y);
  }

  // Keep couples and siblings side by side.
  //
  // dagre decides the left-to-right order of each generation from parent/child
  // links alone, so a spouse can end up wedged between two siblings. We don't
  // move anyone to a new row or change the spacing — we just work out a nicer
  // order within each row and hand the same x slots out in that order.
  const placed = new Map<string, { x: number; y: number }>();
  for (const p of data.people) {
    const node = g.node(p.id) as { x: number; y: number } | undefined;
    if (!node) continue;
    placed.set(p.id, { x: node.x, y: rowOverride.get(p.id) ?? node.y });
  }

  // Who should sit next to whom, strongest tie first.
  const neighbours = new Map<string, Set<string>>();
  const addNeighbour = (a: string, b: string) => {
    if (!placed.has(a) || !placed.has(b)) return;
    if (placed.get(a)!.y !== placed.get(b)!.y) return; // different generations
    if (!neighbours.has(a)) neighbours.set(a, new Set());
    if (!neighbours.has(b)) neighbours.set(b, new Set());
    neighbours.get(a)!.add(b);
    neighbours.get(b)!.add(a);
  };
  for (const s of data.partnerships) addNeighbour(s.aId, s.bId);
  for (const link of siblingLinks) addNeighbour(link.aId, link.bId);

  // Siblings that share a parent should also cluster together.
  const childrenByParent = new Map<string, string[]>();
  for (const e of data.parentEdges) {
    if (!childrenByParent.has(e.parentId)) childrenByParent.set(e.parentId, []);
    childrenByParent.get(e.parentId)!.push(e.childId);
  }
  for (const kids of childrenByParent.values()) {
    for (let i = 1; i < kids.length; i++) addNeighbour(kids[i - 1], kids[i]);
  }

  const byRow = new Map<number, string[]>();
  for (const [id, pos] of placed) {
    if (!byRow.has(pos.y)) byRow.set(pos.y, []);
    byRow.get(pos.y)!.push(id);
  }

  for (const [, ids] of byRow) {
    // The x positions already chosen for this row, kept exactly as they are.
    const slots = ids.map((id) => placed.get(id)!.x).sort((a, b) => a - b);
    const original = [...ids].sort((a, b) => placed.get(a)!.x - placed.get(b)!.x);

    // Walk each connected group as a chain, starting from an end, so a couple
    // stays joined and siblings line up next to each other.
    const seen = new Set<string>();
    const ordered: string[] = [];
    const walk = (id: string) => {
      if (seen.has(id)) return;
      seen.add(id);
      ordered.push(id);
      const next = [...(neighbours.get(id) ?? [])]
        .filter((n) => !seen.has(n) && placed.has(n))
        .sort((a, b) => placed.get(a)!.x - placed.get(b)!.x);
      for (const n of next) walk(n);
    };
    for (const id of original) {
      if (seen.has(id)) continue;
      // Prefer starting at the edge of a group rather than the middle.
      const group = [id];
      const stack = [id];
      const local = new Set([id]);
      while (stack.length) {
        const cur = stack.pop()!;
        for (const n of neighbours.get(cur) ?? []) {
          if (!local.has(n) && placed.has(n)) {
            local.add(n);
            group.push(n);
            stack.push(n);
          }
        }
      }
      const start =
        group
          .filter((m) => !seen.has(m))
          .sort(
            (a, b) =>
              (neighbours.get(a)?.size ?? 0) - (neighbours.get(b)?.size ?? 0) ||
              placed.get(a)!.x - placed.get(b)!.x
          )[0] ?? id;
      walk(start);
    }

    ordered.forEach((id, i) => {
      placed.get(id)!.x = slots[i];
    });
  }

  const nodes: Node<PersonNodeData>[] = data.people.map((p) => {
    const node = g.node(p.id) as { x: number; y: number };
    const pos = placed.get(p.id) ?? { x: node.x, y: rowOverride.get(p.id) ?? node.y };
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
      style: { stroke: "#94a3b8", strokeWidth: 1.8 },
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
