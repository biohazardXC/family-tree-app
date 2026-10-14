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

  const siblingLinks = data.siblingEdges ?? [];

  // ------------------------------------------------------------------
  // Generations: one rule, applied to everybody.
  //
  // dagre ranks people using parent->child links alone. Partners and siblings
  // don't influence it, so they used to be nudged into place afterwards by a
  // single pass that copied a sibling's row from their brother. One pass
  // can't settle a chain: link Julian to Paul, Merissa to Merisca, then give
  // only Merissa a parent, and whoever is adjusted last wins. The result
  // drifted every time sibling links outnumbered parent links.
  //
  // So generations are worked out here instead, from all three kinds of link:
  //   - partners and siblings are the SAME generation (an equality)
  //   - a child is exactly one generation below each parent
  //
  // Equalities are merged first, so each cluster of partners and siblings
  // becomes a single unit. Then each unit is pushed below its parent units,
  // repeatedly, until nothing moves. Everyone in a unit shares a row by
  // construction, so no later patching is needed.
  // ------------------------------------------------------------------
  const genRoot = new Map<string, string>();

  const genFind = (id: string): string => {
    const r = genRoot.get(id);
    if (r === undefined || r === id) return id;
    const top = genFind(r);
    genRoot.set(id, top);
    return top;
  };

  const genUnion = (a: string, b: string) => {
    if (!peopleIds.has(a) || !peopleIds.has(b)) return;
    const ra = genFind(a);
    const rb = genFind(b);
    if (ra !== rb) genRoot.set(ra, rb);
  };

  for (const p of data.people) genRoot.set(p.id, p.id);
  for (const s of data.partnerships) genUnion(s.aId, s.bId);
  for (const link of siblingLinks) genUnion(link.aId, link.bId);

  // Parent -> child, collapsed to the units above.
  const unitChildren = new Map<string, Set<string>>();
  for (const e of data.parentEdges) {
    if (!peopleIds.has(e.parentId) || !peopleIds.has(e.childId)) continue;
    const from = genFind(e.parentId);
    const to = genFind(e.childId);
    // A person who is somehow both parent and sibling of the same person
    // would land in one unit; ignore that link rather than loop forever.
    if (from === to) continue;
    if (!unitChildren.has(from)) unitChildren.set(from, new Set());
    unitChildren.get(from)!.add(to);
  }

  const generation = new Map<string, number>();
  for (const p of data.people) generation.set(genFind(p.id), 0);

  // Relax until stable, in both directions. Pushing children below their
  // parents is only half of "exactly one generation below": a parent must
  // also come down to sit one row above its child. Without that, anyone who
  // marries into a branch that reaches further down is left behind on a top
  // row — James and Miranda Schrikker perched three rows above their own
  // daughters — and their lines trail down across everybody in between.
  //
  // Bounded by the number of units, so a cycle in bad data stops the loop
  // instead of hanging the page.
  const unitCount = new Set([...data.people.map((p) => genFind(p.id))]).size;
  for (let pass = 0; pass < 2 * (unitCount + 1); pass++) {
    let moved = false;
    for (const [from, children] of unitChildren) {
      const next = (generation.get(from) ?? 0) + 1;
      for (const to of children) {
        if ((generation.get(to) ?? 0) < next) {
          generation.set(to, next);
          moved = true;
        }
      }
    }
    for (const [from, children] of unitChildren) {
      for (const to of children) {
        const above = (generation.get(to) ?? 0) - 1;
        if ((generation.get(from) ?? 0) < above) {
          generation.set(from, above);
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  // Row spacing matches what dagre produced before, so the tree looks the
  // same: one node tall plus a gap above and below the invisible family point.
  const ROW_STEP = NODE_H + 2 * 54;
  const rowOverride = new Map<string, number>();
  for (const p of data.people) {
    rowOverride.set(p.id, 40 + (generation.get(genFind(p.id)) ?? 0) * ROW_STEP);
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
  // Dagre's x is only the starting guess: every row is re-placed below. Rows
  // are settled more than once (see the sweeps), so the starting guess has to
  // be restorable — a later pass must not be judged against a half-settled
  // tree it just produced.
  const resetPlace = () => {
    place.clear();
    for (const p of data.people) {
      const node = g.node(p.id) as { x: number; y: number } | undefined;
      if (!node) continue;
      place.set(p.id, { x: node.x, y: rowOverride.get(p.id) ?? node.y });
    }
  };
  resetPlace();

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

  const childrenOf = new Map<string, string[]>();
  for (const e of data.parentEdges) {
    if (!childrenOf.has(e.parentId)) childrenOf.set(e.parentId, []);
    childrenOf.get(e.parentId)!.push(e.childId);
  }

  const layoutRow = (y: number) => {
    const ids = [...place.keys()].filter((id) => place.get(id)!.y === y);

    // Where would each person ideally sit? Under their parents if we've
    // already placed them. People whose parents aren't in the tree at all —
    // a couple who married into the family, say — belong above their own
    // children instead, which is only known once the row below is laid out.
    // Dagre's position is the last resort.
    const parentsAbove = new Map<string, string[]>();
    const anchorOf = new Map<string, number>();
    for (const id of ids) {
      const parents = (parentsOfChild.get(id) ?? []).filter((pid) => {
        const pp = place.get(pid);
        return pp && pp.y < y;
      });
      parentsAbove.set(id, parents);
      if (parents.length > 0) {
        anchorOf.set(
          id,
          parents.reduce((sum, pid) => sum + place.get(pid)!.x, 0) / parents.length
        );
      } else {
        const kids = (childrenOf.get(id) ?? []).filter((cid) => {
          const cp = place.get(cid);
          return cp && cp.y > y;
        });
        anchorOf.set(
          id,
          kids.length > 0
            ? kids.reduce((sum, cid) => sum + place.get(cid)!.x, 0) / kids.length
            : place.get(id)!.x
        );
      }
    }

    // Every line arriving at this row: drawn from a parent above to a child
    // here, kept as (parent x, child) so crossings can be counted without
    // redrawing anything.
    type LineIn = { px: number; childId: string };
    const linesIn: LineIn[] = [];
    const seenLine = new Set<string>();
    for (const id of ids) {
      for (const pid of parentsAbove.get(id)!) {
        const key = `${pid}->${id}`;
        if (seenLine.has(key)) continue;
        seenLine.add(key);
        linesIn.push({ px: place.get(pid)!.x, childId: id });
      }
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

    // Somebody with neither parents nor children of their own — a partner who
    // married in and brought nobody with them, like Courtney Edwards — has no
    // ideal position either. They sit with their partner, so they take their
    // partner's ideal rather than whatever x the starting layout guessed.
    for (const id of ids) {
      if ((parentsAbove.get(id) ?? []).length > 0) continue;
      if ((childrenOf.get(id) ?? []).some((cid) => (place.get(cid)?.y ?? y) > y)) continue;
      const partner = [...(spouseOf.get(id) ?? [])].find((s) => anchorOf.has(s));
      if (partner) anchorOf.set(id, anchorOf.get(partner)!);
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

    // Step 2: order the blocks by barycentre — the mean x of the block's
    // parents, which is where a couple would sit if it simply hung under the
    // people above it. Use only members who actually have parents, so a
    // spouse who married in doesn't drag the block sideways.
    const blockBary = (block: string[]) => {
      const rooted = block.filter((id) => (parentsAbove.get(id) ?? []).length > 0);
      const use = rooted.length > 0 ? rooted : block;
      return use.reduce((sum, id) => sum + anchorOf.get(id)!, 0) / use.length;
    };
    // Blocks are gathered into clusters of brothers and sisters before they
    // are ordered. Children of the same two parents are one family, and a
    // family has to stay in one piece: two sisters with somebody else's
    // husband wedged between them is the complaint this ordering exists to
    // fix. A marriage that reaches into a second family — Merisca is a
    // Schrikker, but she married a Hartzenberg — stitches the two clusters
    // together, and the block doing the stitching sorts by its own
    // barcyentre, which drops it on the seam between them.
    const attachKeys = (block: string[]) => {
      const keys = new Set<string>();
      for (const id of block) {
        const parents = parentsAbove.get(id) ?? [];
        if (parents.length > 0) keys.add([...parents].sort().join("+"));
      }
      return [...keys];
    };
    const clusterKeyOf = new Map<string, string>();
    const clusterFind = (key: string): string => {
      const rootOf = clusterKeyOf.get(key);
      if (rootOf === undefined || rootOf === key) return key;
      const top = clusterFind(rootOf);
      clusterKeyOf.set(key, top);
      return top;
    };
    for (const block of blocks) {
      const keys = attachKeys(block);
      for (const key of keys) {
        if (!clusterKeyOf.has(key)) clusterKeyOf.set(key, key);
      }
      for (let i = 1; i < keys.length; i++) {
        const a = clusterFind(keys[0]);
        const b = clusterFind(keys[i]);
        if (a !== b) clusterKeyOf.set(a, b);
      }
    }
    const clusters = new Map<string, string[][]>();
    for (const block of blocks) {
      const keys = attachKeys(block);
      const key = keys.length > 0 ? clusterFind(keys[0]) : `alone:${block[0]}`;
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key)!.push(block);
    }
    // Clusters are ordered by their own barcyentre — the mean x of the parents
    // they hang from — so a cluster stitched to a second family still sits
    // where its own parents are. Unrelated families stay in their own stretch
    // of the row.
    const clusterBary = (members: string[][]) => {
      const rooted = members.filter((block) =>
        block.some((id) => (parentsAbove.get(id) ?? []).length > 0)
      );
      const use = rooted.length > 0 ? rooted : members;
      return use.reduce((sum, block) => sum + blockBary(block), 0) / use.length;
    };
    const orderedClusters = [...clusters.values()].sort(
      (a, b) =>
        groupRank(a[0][0]) - groupRank(b[0][0]) || clusterBary(a) - clusterBary(b)
    );
    // Inside a cluster the blocks keep their barcyentre order, which is what
    // drops a stitching block between the two families it joins.
    for (const members of orderedClusters) {
      members.sort((a, b) => blockBary(a) - blockBary(b));
    }

    // A household that married in from outside — no parents anywhere in the
    // tree, but children below — has no barcyentre of its own to be ordered
    // by. The only thing that can give it one is the family its children
    // married into: a daughter or son wedded to somebody whose parents are in
    // this row. James and Miranda Schrikker are exactly that case — their two
    // daughters married Hartzenbergs — so the couple belongs beside Gerald
    // and Johanna, on the side their children hang from, not at some end of
    // the row the starting order happened to favour. Their ideal x becomes
    // the host block's, and the block moves into the host's family stretch,
    // right behind them, so the spacing drops it next to the people it
    // married into and every line to their children stays short.
    const blockOfId = new Map<string, string[]>();
    for (const block of blocks) {
      for (const id of block) blockOfId.set(id, block);
    }
    const hasKidsHere = (id: string) =>
      (childrenOf.get(id) ?? []).some((cid) => (place.get(cid)?.y ?? y) > y);
    const isHanging = (block: string[]) =>
      block.every((id) => (parentsAbove.get(id) ?? []).length === 0) &&
      block.some(hasKidsHere);
    const hostOf = new Map<string[], string[]>();
    for (const block of blocks) {
      if (!isHanging(block)) continue;
      for (const id of block) {
        for (const cid of childrenOf.get(id) ?? []) {
          for (const spouse of spouseOf.get(cid) ?? []) {
            for (const parent of parentsOfChild.get(spouse) ?? []) {
              const host = blockOfId.get(parent);
              if (!host || host === block) continue;
              if (place.get(parent)?.y !== y) continue;
              // Two married-in couples holding each other up — Pieter's
              // parents and Sarah's parents — have no host to hang from, and
              // swapping them for each other would only churn the row.
              if (isHanging(host)) continue;
              if (!hostOf.has(block)) hostOf.set(block, host);
            }
          }
        }
      }
    }
    for (const [block, host] of hostOf) {
      const hostBary = blockBary(host);
      for (const id of block) anchorOf.set(id, hostBary);
      const hostMembers = orderedClusters.find((members) => members.includes(host));
      const ownMembers = orderedClusters.find((members) => members.includes(block));
      if (!hostMembers || !ownMembers || hostMembers === ownMembers) continue;
      ownMembers.splice(ownMembers.indexOf(block), 1);
      hostMembers.splice(hostMembers.indexOf(host) + 1, 0, block);
      if (ownMembers.length === 0) {
        orderedClusters.splice(orderedClusters.indexOf(ownMembers), 1);
      }
    }

    blocks.length = 0;
    const clusterIndexOf: number[] = [];
    orderedClusters.forEach((members, clusterIndex) => {
      for (const block of members) {
        blocks.push(block);
        clusterIndexOf.push(clusterIndex);
      }
    });

    // Step 3: shave off crossings.
    //
    // Two lines cross when the order of their parents and the order of their
    // children disagree — nothing else can make them cross. That means the
    // only way to untangle two neighbouring blocks is to swap them, and the
    // swap is worth making exactly when it straightens out more pairs of
    // lines than it crosses. Sweeping the row like a bubble sort, over and
    // over until nothing moves, drags children back under their own parents:
    // two sisters end up side by side instead of with somebody else's brother
    // caught between them.
    const blockLines = blocks.map((block) => {
      const members = new Set(block);
      return linesIn.filter((e) => members.has(e.childId));
    });
    const swapGain = (a: LineIn[], b: LineIn[]) => {
      let gain = 0;
      for (const x of a) {
        for (const y of b) {
          // x's parent sits right of y's parent, so with a on the left the two
          // lines are crossed; swapping the blocks straightens both.
          if (x.px > y.px) gain++;
          else if (x.px < y.px) gain--;
        }
      }
      return gain;
    };
    // A swap is accepted only when it strictly reduces the number of
    // crossings, so the loop can't cycle; the bound is only belt and braces.
    // Only neighbours inside one cluster are candidates: swapping blocks from
    // two different families would tear both of them apart.
    for (let pass = 0; pass < blocks.length; pass++) {
      let swapped = false;
      for (let i = 0; i + 1 < blocks.length; i++) {
        if (clusterIndexOf[i] !== clusterIndexOf[i + 1]) continue;
        if (swapGain(blockLines[i], blockLines[i + 1]) > 0) {
          [blocks[i], blocks[i + 1]] = [blocks[i + 1], blocks[i]];
          [blockLines[i], blockLines[i + 1]] = [blockLines[i + 1], blockLines[i]];
          swapped = true;
        }
      }
      if (!swapped) break;
    }

    // Step 4: which way round does a couple sit?
    //
    // A spouse who married into the family belongs on the side of their
    // partner that points at their own family — Merisca married Paul, but the
    // Schrikkers are her family, so she sits on the side of him nearest them.
    // When both partners have family in the tree, the one whose family comes
    // first sits first. When only one does, the other takes the open side, so
    // they can't come between a brother and a sister.
    const sharedParent = (a: string, b: string) =>
      (parentsOfChild.get(a) ?? []).some((p) => (parentsOfChild.get(b) ?? []).includes(p));
    const siblingsInRow = (id: string, row: string[]) =>
      row.filter(
        (o) =>
          o !== id &&
          ((siblingOf.get(id) ?? new Set<string>()).has(o) || sharedParent(id, o))
      );
    // Where does someone's own family sit? Under their parents if we know
    // them, otherwise wherever their brothers and sisters sit.
    const kinX = (id: string, row: string[]) => {
      if ((parentsAbove.get(id) ?? []).length > 0) return anchorOf.get(id)!;
      const kin = siblingsInRow(id, row).filter((o) => (parentsAbove.get(o) ?? []).length > 0);
      if (kin.length === 0) return null;
      return kin.reduce((sum, o) => sum + anchorOf.get(o)!, 0) / kin.length;
    };
    const ordered = blocks.flat();
    const posOf = new Map(ordered.map((id, i) => [id, i]));
    // Should `spouse` sit to the right of `blood`? Yes when blood's own people
    // are to their left — then the spouse faces the open side.
    const spouseOnRight = (blood: string, spouse: string) => {
      const kin = siblingsInRow(blood, ordered);
      if (kin.length === 0) return true;
      const kinMean = kin.reduce((sum, o) => sum + posOf.get(o)!, 0) / kin.length;
      return kinMean < posOf.get(blood)!;
    };
    for (const block of blocks) {
      // Longer chains — somebody with an ex on one side and a spouse on the
      // other — were already walked in the right order.
      if (block.length !== 2) continue;
      const [a, b] = block;
      const ka = kinX(a, ordered);
      const kb = kinX(b, ordered);
      const aFirst =
        ka !== null && kb !== null
          ? ka <= kb
          : ka !== null
            ? spouseOnRight(a, b)
            : kb !== null
              ? !spouseOnRight(b, a)
              : true;
      if (!aFirst) block.reverse();
    }

    // Read the finished order again: the side rule above may have flipped a
    // couple, and the x positions have to follow the names. Handing them out
    // in the order captured before the flip silently undoes every flip.
    const finalOrdered = blocks.flat();

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
      const wanted = blockBary(block) - width / 2;
      const start: number = cursor === null ? wanted : Math.max(wanted, cursor + gap);
      for (let i = 0; i < block.length; i++) xs.push(start + i * step);
      cursor = start + width;
    }
    // Nudge the row back so it stays centred under the parents above.
    const wantedCentre =
      finalOrdered.reduce((sum, id) => sum + anchorOf.get(id)!, 0) /
      finalOrdered.length;
    const actualCentre = xs.reduce((a, b) => a + b, 0) / xs.length;
    const shift = wantedCentre - actualCentre;
    finalOrdered.forEach((id, i) => {
      place.get(id)!.x = xs[i] + shift;
    });
  };

  // Rows are laid out in sweeps rather than one pass down the tree. The first
  // sweep hangs every child under its parents; the second walks back up, so
  // people with no parents to hang from settle above their own children; the
  // third settles the children again where the upward sweep moved the parents.
  const sweep = () => {
    for (const y of rows) layoutRow(y);
    for (const y of [...rows].reverse()) layoutRow(y);
    for (const y of rows) layoutRow(y);
  };

  // ------------------------------------------------------------------
  // Settle the tree.
  //
  // Three sweeps leave every row the same wherever the starting guess put
  // people with no relatives above them: a household that married in from
  // outside is anchored to the family its children married into (see
  // layoutRow), so it can no longer settle at whichever end of the row the
  // first sweep happened to leave it at.
  // ------------------------------------------------------------------
  resetPlace();
  sweep();

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
