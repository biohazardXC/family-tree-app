// The demo family: three generations of the fictional Mokoena–van Wyk family.
// Some fields are deliberately left blank — real family research always has gaps,
// and a future "missing information" feature will highlight exactly these.

export interface DemoPerson {
  key: string;
  firstName: string;
  lastName?: string;
  maidenName?: string;
  gender?: "male" | "female";
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  notes?: string;
}

export const DEMO_PEOPLE: DemoPerson[] = [
  {
    key: "johan",
    firstName: "Johannes",
    lastName: "Mokoena",
    gender: "male",
    birthDate: "1932",
    birthPlace: "Bethlehem",
    deathDate: "2016",
    notes: "Railway worker who moved the family to Johannesburg in 1954.",
  },
  {
    key: "ruth",
    firstName: "Ruth",
    lastName: "Mokoena",
    maidenName: "Khumalo",
    gender: "female",
    birthDate: "1936",
    birthPlace: "Kroonstad",
    deathDate: "2018",
    deathPlace: "Johannesburg",
    notes: "Taught primary school for 40 years; famous for her melktert.",
  },
  {
    key: "thabo",
    firstName: "Thabo",
    lastName: "Mokoena",
    gender: "male",
    birthDate: "1961",
    birthPlace: "Johannesburg",
    notes: "Eldest son; runs a hardware store in Roodepoort.",
  },
  {
    key: "aisha",
    firstName: "Aisha",
    lastName: "Mokoena",
    maidenName: "Patel",
    gender: "female",
    birthDate: "1963",
    birthPlace: "Durban",
    notes: "Pharmacist; met Thabo at Wits.",
  },
  {
    key: "lerato",
    firstName: "Lerato",
    lastName: "van Wyk",
    maidenName: "Mokoena",
    gender: "female",
    birthDate: "1964",
    birthPlace: "Johannesburg",
  },
  {
    key: "michael",
    firstName: "Michael",
    lastName: "van Wyk",
    gender: "male",
    birthDate: "1963",
    birthPlace: "Cape Town",
  },
  {
    key: "dineo",
    firstName: "Dineo",
    lastName: "Mokoena",
    gender: "female",
    birthDate: "1970",
    birthPlace: "Johannesburg",
    notes: "Emigrated to Perth in 2009.",
  },
  {
    key: "kabelo",
    firstName: "Kabelo",
    lastName: "Naidoo",
    gender: "male",
    birthDate: "1972",
    notes: "Architect; partners with Dineo.",
  },
  {
    key: "zanele",
    firstName: "Zanele",
    lastName: "Mokoena",
    gender: "female",
    birthDate: "1992",
    birthPlace: "Johannesburg",
  },
  {
    key: "sipho",
    firstName: "Sipho",
    lastName: "Mokoena",
    gender: "male",
    birthDate: "1995",
    birthPlace: "Johannesburg",
    notes: "Studying medicine at Wits.",
  },
  {
    key: "emma",
    firstName: "Emma",
    lastName: "van Wyk",
    gender: "female",
    birthDate: "1994",
  },
  {
    key: "josh",
    firstName: "Josh",
    lastName: "van Wyk",
    gender: "male",
    birthDate: "1998",
    birthPlace: "Johannesburg",
  },
  {
    key: "themba",
    firstName: "Thembinkosi",
    lastName: "Naidoo",
    gender: "male",
    birthDate: "2005",
    notes: "Adopted by Dineo and Kabelo as a baby.",
  },
];

export const DEMO_PARTNERSHIPS: { a: string; b: string; status?: string }[] = [
  { a: "johan", b: "ruth", status: "married" },
  { a: "thabo", b: "aisha", status: "married" },
  { a: "lerato", b: "michael", status: "married" },
  { a: "dineo", b: "kabelo", status: "partners" },
];

export const DEMO_PARENT_LINKS: {
  parent: string;
  child: string;
  adoption?: "adopted" | "step" | "foster";
}[] = [
  { parent: "johan", child: "thabo" },
  { parent: "ruth", child: "thabo" },
  { parent: "johan", child: "lerato" },
  { parent: "ruth", child: "lerato" },
  { parent: "johan", child: "dineo" },
  { parent: "ruth", child: "dineo" },
  { parent: "thabo", child: "zanele" },
  { parent: "aisha", child: "zanele" },
  { parent: "thabo", child: "sipho" },
  { parent: "aisha", child: "sipho" },
  { parent: "lerato", child: "emma" },
  { parent: "michael", child: "emma" },
  { parent: "lerato", child: "josh" },
  { parent: "michael", child: "josh" },
  { parent: "dineo", child: "themba", adoption: "adopted" },
  { parent: "kabelo", child: "themba", adoption: "adopted" },
];
