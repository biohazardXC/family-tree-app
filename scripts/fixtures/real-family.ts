/**
 * The live Hartzenberg / Avery / Schrikker family, exactly as
 * https://family-tree-app-sand.vercel.app/api/tree returned it on 2026-10-20:
 * 40 people, 58 parent links, 10 couples, 4 sibling links.
 *
 * Order matters. Two people who want the same spot are separated by the
 * order they arrive in, so the people, couples and links below stay in the
 * API's order. Re-sorting them quietly moves the layout, and a check that
 * measures a different tree than the one on screen is worse than none.
 * Ids are shortened to read; every other value is as returned.
 *
 * This is a fixture, not seed data: `npm run check:real-tree` reads it, and
 * nothing here touches a database.
 */
import type { TreeData } from "../../src/lib/types";

type Spec = [
  id: string,
  firstName: string,
  lastName: string | null,
  gender: "male" | "female" | "other" | null,
  birthDate: string | null,
];

const P: Spec[] = [
  ["paul", "Paul Timothy", "Hartzenberg", "male", "1990-05-25"],
  ["merisca", "Merisca Jaimie", "Hartzenberg", "female", "1995-01-25"],
  ["peter", "Peter", "Avery", "male", "1951-09-22"],
  ["maryann", "Mary Ann", "Avery", "female", "1957-05-22"],
  ["pieter", "Pieter", "Avery", "male", "1925-05-07"],
  ["sarah", "Sarah", "Avery", "female", "1929-02-14"],
  ["johanna", "Johanna", "Avery", "female", "1894"],
  ["sarel", "Sarel", "Avery", "male", "1864"],
  ["etienne", "Etienne", null, "male", "1979-02-11"],
  ["timothy", "Timothy", null, "male", "1980-01-06"],
  ["jacques", "Jacques", null, "male", "1986-05-08"],
  ["lister", "Lister -james", null, "male", "1988-08-23"],
  ["lynn", "Lynn", "Skippers", "female", "1988-03-05"],
  ["taylor", "Taylor Elizabeth", "Magnie", "female", "2000-01-06"],
  ["julian", "Julian Gerald", "Hartzenberg", "male", "1981-05-04"],
  ["james", "James", "Schrikker", null, null],
  ["courtney", "Courtney", "Edwards", "male", null],
  ["ashley", "Ashley Leroy", "Hartzenberg", "male", "1988-06-30"],
  ["miranda", "Miranda", "Schrikker", "female", null],
  ["merissa", "Merissa Hayley", "Edwards", "female", "1995-01-25"],
  ["gerald", "Gerald Julian", "Hartzenberg", "male", "1954-02-01"],
  ["johanna2", "Johanna", "Hartzenberg", "female", "1956-06-20"],
  ["lenieW", "Lenie", "Windvogel", "female", null],
  ["frankW", "Frank", "Windvogel", "male", null],
  ["cyril", "Cyril", "Avery", "male", "1946-11-03"],
  ["frankA", "Frank", "Avery", "male", null],
  ["lenieWatson", "Lenie Magdalene", "Watson", "female", "1950-01-09"],
  ["johannesA", "Johannes", "Avery", "male", "1954-03-31"],
  ["sarahJ", "Sarah Janette", "Jantjies", "female", "1958-09-19"],
  ["mina", "Mina", "Avery", "female", null],
  ["richard", "Richard", "Avery", "male", null],
  ["albert", "Albert Deon", "Avery", "male", "1963-09-01"],
  ["theressa", "Theressa", "Meyers", "female", "1966-11-15"],
  ["elmarie", "Elmarie Claudet", "Uys", "female", "1969-02-07"],
  ["ashleigh", "Ashleigh Robyn", "Maart", "female", "1989-01-20"],
  ["malachi", "Malachi Christian Maart", "Hartzenberg", "male", "2021-02-25"],
  ["elijah", "Elijah Joel Maart", "Hartzenberg", "male", "2024-01-16"],
  ["ezekiel", "Ezekiel Gabriel Maart", "Hartzenberg", "male", "2026-09-01"],
  ["maggie", "Maggie", "Hartzenberg", "female", null],
  ["benjamin", "Benjamin", "Meyer", "male", null],
];

const person = ([id, firstName, lastName, gender, birthDate]: Spec) => ({
  id,
  firstName,
  lastName,
  maidenName: null,
  gender,
  birthDate,
  birthPlace: null,
  deathDate: null,
  deathPlace: null,
  notes: null,
  photoUrl: null,
  isDemo: false,
});

type Couple = [aId: string, bId: string, status: string];
const couples: Couple[] = [
  ["paul", "merisca", "married"],
  ["peter", "maryann", "widowed"],
  ["merissa", "courtney", "married"],
  ["johanna2", "gerald", "married"],
  ["james", "miranda", "married"],
  ["johanna", "sarel", "married"],
  ["sarah", "pieter", "married"],
  ["frankW", "lenieW", "married"],
  ["ashley", "ashleigh", "married"],
  ["benjamin", "maggie", "married"],
];

const parentPairs: [string, string][] = [
  ["pieter", "peter"],
  ["sarah", "peter"],
  ["johanna", "pieter"],
  ["sarel", "pieter"],
  ["peter", "etienne"],
  ["maryann", "etienne"],
  ["peter", "timothy"],
  ["maryann", "timothy"],
  ["peter", "jacques"],
  ["maryann", "jacques"],
  ["peter", "lister"],
  ["maryann", "lister"],
  ["peter", "lynn"],
  ["maryann", "lynn"],
  ["peter", "taylor"],
  ["maryann", "taylor"],
  ["james", "merisca"],
  ["miranda", "merisca"],
  ["james", "merissa"],
  ["miranda", "merissa"],
  ["gerald", "julian"],
  ["gerald", "paul"],
  ["gerald", "ashley"],
  ["johanna2", "julian"],
  ["johanna2", "paul"],
  ["johanna2", "ashley"],
  ["pieter", "johanna2"],
  ["sarah", "johanna2"],
  ["lenieW", "sarah"],
  ["frankW", "sarah"],
  ["pieter", "cyril"],
  ["sarah", "cyril"],
  ["pieter", "frankA"],
  ["sarah", "frankA"],
  ["pieter", "lenieWatson"],
  ["sarah", "lenieWatson"],
  ["pieter", "johannesA"],
  ["sarah", "johannesA"],
  ["pieter", "sarahJ"],
  ["sarah", "sarahJ"],
  ["pieter", "mina"],
  ["sarah", "mina"],
  ["pieter", "richard"],
  ["sarah", "richard"],
  ["pieter", "albert"],
  ["sarah", "albert"],
  ["pieter", "theressa"],
  ["sarah", "theressa"],
  ["pieter", "elmarie"],
  ["sarah", "elmarie"],
  ["ashley", "malachi"],
  ["ashleigh", "malachi"],
  ["ashley", "elijah"],
  ["ashleigh", "elijah"],
  ["ashley", "ezekiel"],
  ["ashleigh", "ezekiel"],
  ["maggie", "gerald"],
  ["benjamin", "gerald"],
];

const adopted = new Set(["malachi", "taylor"]);

export const realFamily: TreeData = {
  people: P.map(person),
  partnerships: couples.map(([aId, bId, status], i) => ({ id: `u${i}`, aId, bId, status })),
  parentEdges: parentPairs.map(([parentId, childId], i) => ({
    id: `e${i}`,
    parentId,
    childId,
    adoption: adopted.has(childId) ? "adopted" : null,
  })),
  siblingEdges: [
    { id: "s1", aId: "julian", bId: "paul" },
    { id: "s2", aId: "paul", bId: "ashley" },
    { id: "s3", aId: "merissa", bId: "merisca" },
    { id: "s4", aId: "julian", bId: "ashley" },
  ],
};
