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

  const nodes: Node<PersonNodeData>[] = data.people.map((p) => {
    const node = g.node(p.id) as { x: number; y: number };
    const pos = { x: node.x, y: rowOverride.get(p.id) ?? node.y };
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
