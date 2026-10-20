/**
 * Checks the layout against the real family, not a made-up one.
 *
 * `scripts/fixtures/real-family.ts` is the Hartzenberg / Avery / Schrikker
 * tree exactly as the live app returns it. It is the tree that produced the
 * complaint this guard exists for: Merisca Hartzenberg (née Schrikker) is
 * married to Paul, but her twin sister Merissa is a daughter of James and
 * Miranda Schrikker too — and in a careless ordering a husband from an
 * unrelated family ends up wedged between the two sisters, with their
 * parents' lines drawn across him.
 *
 * Run it with `npm run check:real-tree`. It fails if:
 *   - anything sits between the two sisters,
 *   - anyone but a sibling sits between two children of the same parents,
 *   - a parent line is drawn over an unrelated card,
 *   - the Hartzenberg brothers are out of birth order,
 *   - the same data lays out differently twice.
 */
import { layoutTree, NODE_H, NODE_W } from "../src/lib/layout";
import { realFamily } from "./fixtures/real-family";
import type { PersonDTO, TreeData } from "../src/lib/types";

const failures: string[] = [];
const check = (ok: boolean, message: string) => {
  if (!ok) failures.push(message);
};

const data: TreeData = realFamily;
const result = layoutTree(data);

const name = new Map(data.people.map((p) => [p.id, p.firstName]));
const positions = new Map(
  result.nodes.map((n) => [
    n.id,
    { x: n.position.x + NODE_W / 2, y: n.position.y + NODE_H / 2 },
  ])
);

const rowKeys = [...new Set([...positions.values()].map((p) => Math.round(p.y)))].sort(
  (a, b) => a - b
);
const rowOf = (id: string) => rowKeys.indexOf(Math.round(positions.get(id)!.y));

const rows: string[][] = rowKeys.map((y) =>
  data.people
    .filter((p) => Math.round(positions.get(p.id)!.y) === y)
    .sort((a, b) => positions.get(a.id)!.x - positions.get(b.id)!.x)
    .map((p) => p.firstName)
);
rows.forEach((row, i) => console.log(`row ${i}: ${row.join("  —  ")}`));

// --- crossing count, the way a reader would count them --------------------
const lines = data.parentEdges.filter(
  (e) => positions.has(e.parentId) && positions.has(e.childId)
);
let crossings = 0;
for (let i = 0; i < lines.length; i++) {
  for (let j = i + 1; j < lines.length; j++) {
    const a = lines[i];
    const b = lines[j];
    if (a.parentId === b.parentId || a.childId === b.childId) continue;
    if (a.parentId === b.childId || a.childId === b.parentId) continue;
    const pa = positions.get(a.parentId)!;
    const pb = positions.get(b.parentId)!;
    const ca = positions.get(a.childId)!;
    const cb = positions.get(b.childId)!;
    if (pa.y >= ca.y || pb.y >= cb.y) continue;
    const parentOrder = Math.sign(pa.x - pb.x);
    const childOrder = Math.sign(ca.x - cb.x);
    if (parentOrder !== 0 && childOrder !== 0 && parentOrder !== childOrder) crossings++;
  }
}
console.log(`\nparent → child lines: ${lines.length}`);
console.log(`crossing pairs: ${crossings}`);

// --- nobody may stand between two sisters --------------------------------
const between = (a: string, b: string) => {
  const lo = Math.min(positions.get(a)!.x, positions.get(b)!.x);
  const hi = Math.max(positions.get(a)!.x, positions.get(b)!.x);
  return data.people
    .filter((p) => {
      if (rowOf(p.id) !== rowOf(a)) return false;
      const x = positions.get(p.id)!.x;
      return x > lo && x < hi;
    })
    .map((p) => p.firstName);
};
const wedged = between("merisca", "merissa");
console.log(`between Merisca and Merissa: [${wedged.join(", ")}]`);
check(wedged.length === 0, `somebody is wedged between the two sisters: ${wedged.join(", ")}`);

// --- and not between any two children of the same parents ----------------
const parentsOf = new Map<string, string[]>();
for (const e of data.parentEdges) {
  if (!parentsOf.has(e.childId)) parentsOf.set(e.childId, []);
  parentsOf.get(e.childId)!.push(e.parentId);
}
const sig = (p: PersonDTO) => [...new Set(parentsOf.get(p.id) ?? [])].sort().join("+");
const siblingPairs: [string, string][] = [];
for (let i = 0; i < data.people.length; i++) {
  for (let j = i + 1; j < data.people.length; j++) {
    const a = data.people[i];
    const b = data.people[j];
    const sa = sig(a);
    if (!sa || sa !== sig(b)) continue;
    if (rowOf(a.id) !== rowOf(b.id)) continue;
    siblingPairs.push([a.id, b.id]);
  }
}
const spouseOf = new Map<string, string[]>();
for (const u of data.partnerships) {
  spouseOf.set(u.aId, [...(spouseOf.get(u.aId) ?? []), u.bId]);
  spouseOf.set(u.bId, [...(spouseOf.get(u.bId) ?? []), u.aId]);
}
for (const [a, b] of siblingPairs) {
  // Who is allowed to stand between two brothers or sisters? Other brothers
  // and sisters, and their husbands and wives. Nobody else — a stranger from
  // an unrelated family is exactly the defect.
  const family = data.people.filter((p) => sig(p) === sig(data.people.find((q) => q.id === a)!));
  const allowed = new Set<string>();
  for (const member of family) {
    allowed.add(member.id);
    for (const spouse of spouseOf.get(member.id) ?? []) allowed.add(spouse);
  }
  const inside = data.people
    .filter((p) => rowOf(p.id) === rowOf(a) && !allowed.has(p.id))
    .filter((p) => {
      const x = positions.get(p.id)!.x;
      const lo = Math.min(positions.get(a)!.x, positions.get(b)!.x);
      const hi = Math.max(positions.get(a)!.x, positions.get(b)!.x);
      return x > lo && x < hi;
    })
    .map((p) => p.firstName);
  check(
    inside.length === 0,
    `${inside.join(", ")} sits between the siblings ${name.get(a)} and ${name.get(b)}`
  );
}

// --- no line drawn across an unrelated card ------------------------------
let buried = 0;
for (const e of data.parentEdges) {
  const rp = rowOf(e.parentId);
  const rc = rowOf(e.childId);
  if (rc <= rp + 1) continue;
  const px = positions.get(e.parentId)!.x;
  const cx = positions.get(e.childId)!.x;
  const lo = Math.min(px, cx);
  const hi = Math.max(px, cx);
  for (const q of data.people) {
    const rq = rowOf(q.id);
    if (rq <= rp || rq >= rc) continue;
    if (q.id === e.parentId || q.id === e.childId) continue;
    const qx = positions.get(q.id)!.x;
    if (hi > qx - NODE_W / 2 && lo < qx + NODE_W / 2) {
      buried++;
      console.log(`   buried: ${name.get(e.parentId)} → ${name.get(e.childId)} passes over ${q.firstName}`);
    }
  }
}
console.log(`lines drawn over an unrelated card: ${buried}`);
check(buried === 0, `${buried} line(s) drawn over an unrelated card`);

// --- the three Hartzenberg brothers, eldest first ------------------------
const brothers = ["julian", "ashley", "paul"]
  .filter((id) => positions.has(id))
  .sort((a, b) => positions.get(a)!.x - positions.get(b)!.x)
  .map((id) => name.get(id));
check(
  brothers.join("|") === "Julian Gerald|Ashley Leroy|Paul Timothy",
  `the brothers read ${brothers.join(" — ")} instead of Julian Gerald — Ashley Leroy — Paul Timothy`
);

// --- the same data must always lay out the same way ---------------------
const again = layoutTree(data);
check(
  JSON.stringify(again.nodes) === JSON.stringify(result.nodes),
  "two layouts of identical data came out different"
);

if (failures.length > 0) {
  console.error("\nReal-tree layout checks failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("\nOK: sisters side by side, siblings unbroken, eldest first, nothing buried.");
