import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { PersonDTO, TreeData } from "./types";

export const NODE_W = 216;
export const NODE_H = 96;

export type PersonNodeData = { person: PersonDTO; adopted?: boolean };

/**
 * Standard genealogical symbols, shown in the middle of a partner line.
 * ⚭ joined rings = married, ⚮ broken rings = divorced, ⚯ open rings =
 * together but not married.
 */
const PARTNER_SYMBOL: Record<string, string> = {
  married: "⚭",
  engaged: "⚯",
  partners: "⚯",
  divorced: "⚮",
  widowed: "⚰",
};

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
  // Marriage binds tighter than being someone's brother or sister: a person
  // with an ex-partner and a current partner belongs between the two of them,
  // with their siblings pushed out to the sides.
  const spouseOf = new Map<string, Set<string>>();
  const siblingOf = new Map<string, Set<string>>();
  const pairUp = (map: Map<string, Set<string>>, a: string, b: string) => {
    if (!place.has(a) || !place.has(b)) return;
    if (place.get(a)!.y !== place.get(b)!.y) return;
    if (!map.has(a)) map.set(a, new Set());
    if (!map.has(b)) map.set(b, new Set());
    map.get(a)!.add(b);
    map.get(b)!.add(a);
  };
  for (const s of data.partnerships) pairUp(spouseOf, s.aId, s.bId);
  for (const link of siblingLinks) pairUp(siblingOf, link.aId, link.bId);

  // ------------------------------------------------------------------
  // Separate families must not get shuffled together.
  //
  // Two branches that share no relationship at all can easily end up in the
  // same generation. Packing a row purely by position interleaves them, and
  // two strangers standing shoulder to shoulder read as if they're related.
  // So we work out which people are actually joined to each other — by birth,
  // marriage or a sibling link — and keep each of those groups whole, with a
  // wide gap between them.
  // ------------------------------------------------------------------
  const GROUP_GAP = 150;
  const root = new Map<string, string>();
  const find = (id: string): string => {
    const r = root.get(id);
    if (r === undefined || r === id) return id;
    const top = find(r);
    root.set(id, top);
    return top;
  };
  const union = (a: string, b: string) => {
    if (!place.has(a) || !place.has(b)) return;
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) root.set(ra, rb);
  };
  for (const p of data.people) root.set(p.id, p.id);
  for (const e of data.parentEdges) union(e.parentId, e.childId);
  for (const s of data.partnerships) union(s.aId, s.bId);
  for (const link of siblingLinks) union(link.aId, link.bId);

  // Keep a stable left-to-right order for the groups themselves.
  const groupSeen: string[] = [];
  for (const p of [...data.people].sort(
    (a, b) => (place.get(a.id)?.x ?? 0) - (place.get(b.id)?.x ?? 0)
  )) {
    if (!place.has(p.id)) continue;
    const r = find(p.id);
    if (!groupSeen.includes(r)) groupSeen.push(r);
  }
  const groupRank = (id: string) => groupSeen.indexOf(find(id));

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
    // Sibling-linked people with no parents of their own have nothing to be
    // anchored to, so borrow the average of the group they belong to.
    for (const id of ids) {
      const sibs = [...(siblingOf.get(id) ?? [])].filter((n) => ids.includes(n));
      if (sibs.length === 0) continue;
      const known = [id, ...sibs].filter((n) => (parentsOfChild.get(n) ?? []).length > 0);
      if (known.length > 0 && (parentsOfChild.get(id) ?? []).length === 0) {
        anchorOf.set(id, known.reduce((s, n) => s + anchorOf.get(n)!, 0) / known.length);
      }
    }

    // Step 1: glue married couples into blocks that can't be split up.
    const blocks: string[][] = [];
    const inBlock = new Set<string>();
    for (const seed of [...ids].sort((a, b) => anchorOf.get(a)! - anchorOf.get(b)!)) {
      if (inBlock.has(seed)) continue;

      const members = new Set<string>([seed]);
      const stack = [seed];
      while (stack.length > 0) {
        const cur = stack.pop()!;
        for (const n of spouseOf.get(cur) ?? []) {
          if (!members.has(n) && ids.includes(n)) {
            members.add(n);
            stack.push(n);
          }
        }
      }

      // Walk the couple chain from one end, so somebody with two partners
      // (an ex and a current spouse) sits between them.
      const chain: string[] = [];
      const seen = new Set<string>();
      const start = [...members].sort(
        (a, b) =>
          (spouseOf.get(a)?.size ?? 0) - (spouseOf.get(b)?.size ?? 0) ||
          anchorOf.get(a)! - anchorOf.get(b)!
      )[0];
      const walk = (id: string) => {
        if (seen.has(id)) return;
        seen.add(id);
        chain.push(id);
        const next = [...(spouseOf.get(id) ?? [])]
          .filter((n) => !seen.has(n) && members.has(n))
          .sort((a, b) => anchorOf.get(a)! - anchorOf.get(b)!);
        for (const n of next) walk(n);
      };
      walk(start);

      for (const m of chain) inBlock.add(m);
      blocks.push(chain);
    }

    // Step 2: order the blocks. Use only members who actually have parents,
    // so a spouse who married in doesn't drag the block sideways.
    const blockAnchor = (block: string[]) => {
      const rooted = block.filter((id) => (parentsOfChild.get(id) ?? []).length > 0);
      const use = rooted.length > 0 ? rooted : block;
      return use.reduce((sum, id) => sum + anchorOf.get(id)!, 0) / use.length;
    };
    // Unrelated families stay in their own stretch of the row.
    blocks.sort(
      (a, b) => groupRank(a[0]) - groupRank(b[0]) || blockAnchor(a) - blockAnchor(b)
    );

    const ordered = blocks.flat();

    // Space them out left to right. Everyone inside a block — a couple, or a
    // person with two partners — is spaced exactly one card apart so they
    // read as a unit. Blocks are placed under their own centre of gravity,
    // and a wider gap opens up where one family ends and the next begins.
    const step = NODE_W + H_GAP;
    const xs: number[] = [];
    let cursor: number | null = null;
    for (let b = 0; b < blocks.length; b++) {
      const block = blocks[b];
      const gap =
        b > 0 && groupRank(block[0]) !== groupRank(blocks[b - 1][0])
          ? step + GROUP_GAP
          : step;
      const width = (block.length - 1) * step;
      const wanted = blockAnchor(block) - width / 2;
      const start: number = cursor === null ? wanted : Math.max(wanted, cursor + gap);
      for (let i = 0; i < block.length; i++) xs.push(start + i * step);
      cursor = start + width;
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
    // If the two of them already share a parent, the tree shows they're
    // siblings all by itself — drawing a second line just adds clutter, and
    // it has to hop over anyone sitting between them. Only draw the link
    // when there are no known parents to show the relationship for us.
    const aParents = parentsOfChild.get(link.aId) ?? [];
    const bParents = parentsOfChild.get(link.bId) ?? [];
    if (aParents.some((pid) => bParents.includes(pid))) continue;

    edges.push({
      id: `sibling-${link.id}`,
      source: link.aId,
      target: link.bId,
      sourceHandle: "s-right",
      targetHandle: "t-left",
      type: "smoothstep",
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
      // The traditional genealogy symbols, sitting on the middle of the line:
      // rings joined for a marriage, broken for a divorce.
      label: PARTNER_SYMBOL[s.status ?? "married"] ?? PARTNER_SYMBOL.married,
      labelStyle: {
        fill: s.status === "divorced" ? "#9f1239" : "#be123c",
        fontSize: 16,
        fontWeight: 600,
      },
      labelShowBg: true,
      labelBgStyle: { fill: "#ffffff", stroke: "#fecdd3" },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 10,
      style: {
        stroke: "#fb7185",
        strokeWidth: 2.2,
        strokeDasharray: s.status === "divorced" ? "6 5" : undefined,
      },
    });
  }

  return { nodes, edges };
}
