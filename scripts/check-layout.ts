/**
 * Guards the row layout against the defect that was reported on the family
 * tree: Merisca and Merissa Schrikker are sisters who each married into the
 * same family, and an ordering that only sorts couples by where their parents
 * sit — without ever checking whether the lines it draws actually cross —
 * wedges a husband between the two sisters and draws their parents' lines
 * across unrelated people.
 *
 * The tree below is the same shape as the real one with made-up names:
 *
 *   great-grandparents ─ one son, married to somebody whose own parents are
 *                        not in the tree
 *   that couple ─ ten children, one of whom marries a sister
 *   a household that married in from outside ─ two daughters, who marry
 *                        into the two families above
 *
 * Run it with `npm run check:layout`. It exits non-zero if the layout starts
 * burying lines under cards, splitting sisters, or settling differently on
 * the same data.
 */
import { layoutTree, NODE_W, NODE_H } from "../src/lib/layout";
import type { TreeData } from "../src/lib/types";

const p = (id: string, firstName: string, extra: Record<string, unknown> = {}) => ({
  id,
  firstName,
  lastName: null as string | null,
  maidenName: null as string | null,
  gender: null as "male" | "female" | "other" | null,
  birthDate: null as string | null,
  birthPlace: null as string | null,
  deathDate: null as string | null,
  deathPlace: null as string | null,
  notes: null as string | null,
  photoUrl: null as string | null,
  isDemo: false,
  ...extra,
});

// Ten children for the middle couple, so the row is wide enough for a
// mis-ordered couple to end up with lines drawn over other people.
const siblings = Array.from({ length: 10 }, (_, i) => `sib${i + 1}`);
const cousins = Array.from({ length: 6 }, (_, i) => `cous${i + 1}`);

const data: TreeData = {
  people: [
    p("gg1", "Great", { gender: "male" }),
    p("gg2", "Grand", { gender: "female" }),
    // The host couple: everyone above hangs off them.
    p("mom", "Mother", { gender: "female" }),
    p("dad", "Father", { gender: "male" }),
    // The household that married in from outside: no parents in the tree,
    // two daughters who marry into the families above. This is the
    // Schrikker case.
    p("mom2", "Stepmother", { gender: "female" }),
    p("dad2", "Stepfather", { gender: "male" }),
    p("in1", "Ines", { gender: "female" }),
    p("in2", "Ivan", { gender: "male" }),
    // The daughters: sisters, and the two people who must not be separated.
    p("d1", "Daughter", { gender: "female" }),
    p("d2", "Younger Daughter", { gender: "female" }),
    ...siblings.map((id, i) => p(id, `Sibling${i + 1}`, { gender: i % 2 ? "female" : "male" })),
    ...cousins.map((id, i) => p(id, `Cousin${i + 1}`, { gender: i % 2 ? "female" : "male" })),
    // A partner who married in and brought nobody: no parents, no children.
    p("x1", "Outsider", { gender: "male" }),
  ],
  partnerships: [
    { id: "u1", aId: "gg1", bId: "gg2", status: "married" },
    { id: "u2", aId: "dad", bId: "mom", status: "married" },
    { id: "u6", aId: "dad2", bId: "mom2", status: "married" },
    { id: "u3", aId: "in2", bId: "in1", status: "married" },
    { id: "u4", aId: "sib1", bId: "d1", status: "married" },
    { id: "u5", aId: "x1", bId: "d2", status: "married" },
  ],
  parentEdges: [
    { id: "e1", parentId: "gg1", childId: "dad", adoption: null },
    { id: "e2", parentId: "gg2", childId: "dad", adoption: null },
    ...siblings.flatMap((id, i) => [
      { id: `m${i}a`, parentId: "dad", childId: id, adoption: null },
      { id: `m${i}b`, parentId: "mom", childId: id, adoption: null },
    ]),
    ...cousins.flatMap((id, i) => [
      { id: `c${i}a`, parentId: "dad2", childId: id, adoption: null },
      { id: `c${i}b`, parentId: "mom2", childId: id, adoption: null },
    ]),
    { id: "e3", parentId: "in1", childId: "d1", adoption: null },
    { id: "e4", parentId: "in2", childId: "d1", adoption: null },
    { id: "e5", parentId: "in1", childId: "d2", adoption: null },
    { id: "e6", parentId: "in2", childId: "d2", adoption: null },
  ],
  siblingEdges: [{ id: "s1", aId: "d1", bId: "d2" }],
};

const nameOf = new Map(data.people.map((person) => [person.id, person.firstName]));

const failures: string[] = [];
const check = (ok: boolean, message: string) => {
  if (!ok) failures.push(message);
};

const result = layoutTree(data);

type Spot = { id: string; name: string; cx: number; cy: number };
const spots: Spot[] = result.nodes.map((node) => ({
  id: node.id,
  name: nameOf.get(node.id) ?? node.id,
  cx: node.position.x + NODE_W / 2,
  cy: node.position.y + NODE_H / 2,
}));
const at = new Map(spots.map((s) => [s.id, s]));
const rowKeys = [...new Set(spots.map((s) => Math.round(s.cy)))].sort((a, b) => a - b);
const rowOf = (id: string) => rowKeys.indexOf(Math.round(at.get(id)!.cy));

const rows: string[][] = rowKeys.map((y) =>
  spots
    .filter((s) => Math.round(s.cy) === y)
    .sort((a, b) => a.cx - b.cx)
    .map((s) => s.name)
);
rows.forEach((row, i) => console.log(`row ${i}: ${row.join("  —  ")}`));

// 1. Every line is drawn clear of unrelated cards.
let buried = 0;
for (const e of data.parentEdges) {
  const rp = rowOf(e.parentId);
  const rc = rowOf(e.childId);
  if (rc <= rp + 1) continue;
  const px = at.get(e.parentId)!.cx;
  const cx = at.get(e.childId)!.cx;
  const lo = Math.min(px, cx);
  const hi = Math.max(px, cx);
  for (const q of spots) {
    const rq = rowOf(q.id);
    if (rq <= rp || rq >= rc) continue;
    if (q.id === e.parentId || q.id === e.childId) continue;
    if (hi > q.cx - NODE_W / 2 && lo < q.cx + NODE_W / 2) {
      buried++;
      console.log(`   buried: ${nameOf.get(e.parentId)}→${nameOf.get(e.childId)} passes over ${q.name}`);
    }
  }
}
check(buried === 0, `${buried} line(s) drawn over an unrelated card (the reported defect)`);

// 2. Two sisters married into the same family stay side by side: nobody who
//    is neither their spouse nor their sibling may sit between them.
const between = spots
  .filter((s) => {
    if (rowOf(s.id) !== rowOf("d1")) return false;
    const lo = Math.min(at.get("d1")!.cx, at.get("d2")!.cx);
    const hi = Math.max(at.get("d1")!.cx, at.get("d2")!.cx);
    return s.cx > lo && s.cx < hi;
  })
  .map((s) => s.name);
check(
  between.length === 0,
  `somebody sits between the two sisters: ${between.join(", ")}`
);

// 3. The married-in household sits beside the family its children married
//    into, in the same row, not parked at the far end.
const d1Row = rows.findIndex((row) => row.includes("Daughter"));
const inRow = rows.findIndex((row) => row.includes("Ines"));
check(inRow === d1Row - 1, `Ines should sit in the row above her daughters (row ${inRow} vs ${d1Row - 1})`);

// 4. Same data, same tree, every time.
const again = layoutTree(data);
check(
  JSON.stringify(again.nodes) === JSON.stringify(result.nodes),
  "two layouts of identical data came out different"
);

if (failures.length > 0) {
  console.error("\nLayout checks failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("\nOK: no lines buried under cards, sisters together, layout stable.");
