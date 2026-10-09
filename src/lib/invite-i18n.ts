/**
 * Wording for the invitee's form, in English and Afrikaans.
 *
 * Only the invite flow is translated — that's the part shared with the wider
 * family. The admin side (review queue, tree editing) stays in English.
 *
 * The Afrikaans is written the way people actually speak, not the way forms
 * usually sound: "Wie is hulle ander ouer?" rather than officialese.
 */

export type Lang = "en" | "af";

export const LANGUAGES: { code: Lang; label: string; note: string }[] = [
  { code: "en", label: "English", note: "Continue in English" },
  { code: "af", label: "Afrikaans", note: "Gaan voort in Afrikaans" },
];

export interface Strings {
  brand: string;
  loading: string;

  langTitle: string;
  langSubtitle: string;

  invalidTitle: string;
  invalidBody: string;

  doneThanks: string;
  doneAllSet: string;
  doneBody: string;
  doneMore: string;
  doneView: string;

  welcomeHello: (name: string) => string;
  welcomeBody: string;
  welcomeImmediate: string;
  welcomeTime: string;
  welcomeStart: string;
  welcomeJustView: string;

  stepOf: (a: number, b: number) => string;
  back: string;
  continue: string;
  remove: string;
  change: string;
  yes: string;
  skipThis: string;

  // fields
  firstName: string;
  surname: string;
  surnameHint: string;
  maidenName: string;
  maidenHint: string;
  gender: string;
  female: string;
  male: string;
  birthDate: string;
  birthDateHint: string;
  birthPlace: string;
  birthPlacePlaceholder: string;
  hasPassed: string;
  deathDate: string;
  deathPlace: string;
  deathPlacePlaceholder: string;

  // date boxes
  dateFormat: string;
  dateYearOnly: string;
  dateClear: string;
  dateNeedYear: string;
  dateBadYear: string;
  dateNeedMonth: string;
  dateBadMonth: string;
  dateBadDay: string;
  dateDaysInMonth: (days: number) => string;

  // duplicate matching
  matchLinked: (name: string) => string;
  matchUndo: string;
  matchChecking: string;
  matchMaybe: (name: string) => string;
  matchScore: (score: number) => string;
  matchYes: string;
  matchNo: string;

  // steps
  stepYou: string;
  stepPartner: string;
  stepParents: string;
  stepGrandparents: string;
  stepChildren: string;
  stepSiblings: string;
  stepReview: string;

  // photos
  photoAdd: string;
  photoReplace: string;
  photoRemove: string;
  photoUploading: string;
  photoFailed: string;
  photoHint: string;
  photoStepTitle: string;

  youTitle: string;
  youSubtitle: string;

  partnerTitle: string;
  partnerSubtitle: string;
  partnerLabel: string;
  previousPartnerLabel: string;
  relationship: string;
  statusMarried: string;
  statusPartners: string;
  statusDivorced: string;
  statusWidowed: string;
  partnerQuestion: string;
  addAnotherPartner: string;

  parentsTitle: string;
  parentsSubtitle: string;
  parentN: (i: number) => string;
  addParentN: (i: number) => string;

  grandparentsTitle: string;
  grandparentsSubtitle: string;
  grandparentsNeedParent: string;
  parentsOfNamed: (name: string) => string;
  parentsOfIndex: (i: number) => string;
  motherLabel: string;
  fatherLabel: string;
  addMother: string;
  addFather: string;
  greatGrandTitle: string;
  greatGrandBody: string;

  childrenTitle: string;
  childrenSubtitle: string;
  childN: (i: number) => string;
  otherParentQuestion: string;
  previousPartnerSuffix: string;
  someoneElse: string;
  howJoined: string;
  adoptionBio: string;
  adoptionAdopted: string;
  adoptionStep: string;
  adoptionFoster: string;
  addChild: string;

  siblingsTitle: string;
  siblingsSubtitle: string;
  siblingN: (i: number) => string;
  addSibling: string;

  reviewTitle: string;
  reviewSubtitle: string;
  reviewEmpty: string;
  reviewYou: string;
  willLinkTo: (name: string) => string;
  bornOn: (date: string) => string;
  newToTree: string;
  send: string;
  sending: string;

  errNeedFirstName: string;
  errNeedNameFor: (label: string) => string;
  errNeedChildName: string;
  errNeedSiblingName: string;
  errSendFailed: string;
  labelPartnerN: (i: number) => string;
  labelParentN: (i: number) => string;
}

const en: Strings = {
  brand: "Family tree",
  loading: "Opening your form…",

  langTitle: "Choose your language",
  langSubtitle: "Kies jou taal",

  invalidTitle: "This link isn't valid",
  invalidBody: "It may have been mistyped, or a newer link was sent. Please ask for a new one.",

  doneThanks: "Thank you",
  doneAllSet: "You're all set",
  doneBody:
    "Your family information has been sent for review. Once it's approved, it will appear in the family tree.",
  doneMore:
    "Remembered more — great-grandparents, or another branch? Ask for a second link and add them separately. Nothing here needs redoing.",
  doneView: "View the family tree",

  welcomeHello: (name) => `Hello ${name}!`,
  welcomeBody: "You're invited to share your family's information for our family tree. Just your",
  welcomeImmediate: "immediate family",
  welcomeTime: "Takes about 5 minutes. Anything you don't know, just skip.",
  welcomeStart: "Let's start →",
  welcomeJustView: "Just show me the family tree",

  stepOf: (a, b) => `Step ${a} of ${b}`,
  back: "← Back",
  continue: "Continue →",
  remove: "Remove",
  change: "Change",
  yes: "Yes",
  skipThis: "Skip this",

  firstName: "First name",
  surname: "Surname",
  surnameHint: "Family surname",
  maidenName: "Maiden name",
  maidenHint: "Only if their surname changed",
  gender: "Gender",
  female: "Female",
  male: "Male",
  birthDate: "Date of birth",
  birthDateHint: "If you only know the year, just fill in the year.",
  birthPlace: "Place of birth",
  birthPlacePlaceholder: "e.g. Kroonstad",
  hasPassed: "Have they passed away?",
  deathDate: "Date of death",
  deathPlace: "Place of death",
  deathPlacePlaceholder: "e.g. Johannesburg",

  dateFormat: "dd / mm / yyyy",
  dateYearOnly: "Just the year is fine.",
  dateClear: "Clear",
  dateNeedYear: "Please give at least a year.",
  dateBadYear: "The year should be four digits, like 1936.",
  dateNeedMonth: "Please choose a month as well, or clear the day.",
  dateBadMonth: "The month should be between 1 and 12.",
  dateBadDay: "The day should be between 1 and 31.",
  dateDaysInMonth: (days) => `That month only has ${days} days.`,

  matchLinked: (name) => `Already in the tree as ${name} — we'll link to them.`,
  matchUndo: "Undo",
  matchChecking: "Checking the tree…",
  matchMaybe: (name) => `We might already know ${name}:`,
  matchScore: (score) => `${score}% match`,
  matchYes: "Yes, same person",
  matchNo: "No, different person",

  stepYou: "You",
  stepPartner: "Partner",
  stepParents: "Parents",
  stepGrandparents: "Grandparents",
  stepChildren: "Children",
  stepSiblings: "Siblings",
  stepReview: "Review",

  photoAdd: "Add a photo",
  photoReplace: "Change photo",
  photoRemove: "Remove photo",
  photoUploading: "Sending…",
  photoFailed: "That photo didn't upload. Please try again.",
  photoHint: "Optional. Any photo of them is lovely — old ones especially.",
  photoStepTitle: "Photo",

  youTitle: "About you",
  youSubtitle: "Let's start with your own details.",

  partnerTitle: "Your partner",
  partnerSubtitle:
    "Husband, wife or partner. You can add a previous partner too — that helps us put children in the right place.",
  partnerLabel: "Partner",
  previousPartnerLabel: "Previous partner",
  relationship: "Your relationship",
  statusMarried: "Married",
  statusPartners: "Partners",
  statusDivorced: "Divorced",
  statusWidowed: "Widowed",
  partnerQuestion: "Do you have a partner to add?",
  addAnotherPartner: "+ Add another partner (for example someone you were married to before)",

  parentsTitle: "Your parents",
  parentsSubtitle: "Add one or both — or skip if you'd rather not.",
  parentN: (i) => `Parent ${i}`,
  addParentN: (i) => `+ Add parent ${i}`,

  grandparentsTitle: "Your grandparents",
  grandparentsSubtitle: "Your parents' parents. Even just a name and a year helps enormously.",
  grandparentsNeedParent:
    "Go back a step and add a parent first — then we can put their mother and father in the right place.",
  parentsOfNamed: (name) => `${name}'s parents`,
  parentsOfIndex: (i) => `Parent ${i}'s parents`,
  motherLabel: "Mother",
  fatherLabel: "Father",
  addMother: "+ Add mother",
  addFather: "+ Add father",
  greatGrandTitle: "Do you know your great-grandparents?",
  greatGrandBody:
    "We keep this form short on purpose, so we stop at grandparents. If you can go back further, reply to whoever sent you this link and ask for a second link — you can fill in that older generation on its own, without holding this one up.",

  childrenTitle: "Your children",
  childrenSubtitle: "Each child, and how they joined your family.",
  childN: (i) => `Child ${i}`,
  otherParentQuestion: "Who is their other parent?",
  previousPartnerSuffix: " (previous partner)",
  someoneElse: "Someone else, or I'd rather not say",
  howJoined: "How did they join your family?",
  adoptionBio: "Biological child",
  adoptionAdopted: "Adopted",
  adoptionStep: "Step-child",
  adoptionFoster: "Foster child",
  addChild: "+ Add a child",

  siblingsTitle: "Your siblings",
  siblingsSubtitle: "Brothers and sisters — including half- or step-siblings.",
  siblingN: (i) => `Sibling ${i}`,
  addSibling: "+ Add a sibling",

  reviewTitle: "Ready to send",
  reviewSubtitle: "Here's everything you've told us. Tap a section to go back and change it.",
  reviewEmpty: "Nothing added yet — go back and add at least your own details.",
  reviewYou: "You",
  willLinkTo: (name) => `Will be linked to ${name} (already in tree)`,
  bornOn: (date) => `Born ${date}`,
  newToTree: "New to the tree",
  send: "Send my info 🌳",
  sending: "Sending…",

  errNeedFirstName: "Please add your first name.",
  errNeedNameFor: (label) => `Please add a first name for the ${label}, or clear the other boxes.`,
  errNeedChildName: "Please add a first name for each child, or remove them.",
  errNeedSiblingName: "Please add a first name for each sibling, or remove them.",
  errSendFailed: "Could not send — please try again.",
  labelPartnerN: (i) => `partner ${i}`,
  labelParentN: (i) => `parent ${i}`,
};

const af: Strings = {
  brand: "Familieboom",
  loading: "Jou vorm word oopgemaak…",

  langTitle: "Choose your language",
  langSubtitle: "Kies jou taal",

  invalidTitle: "Hierdie skakel werk nie",
  invalidBody:
    "Dit is dalk verkeerd ingetik, of 'n nuwer skakel is gestuur. Vra asseblief vir 'n nuwe een.",

  doneThanks: "Baie dankie",
  doneAllSet: "Alles is reg",
  doneBody:
    "Jou familie se inligting is gestuur vir nasien. Sodra dit goedgekeur is, sal dit in die familieboom verskyn.",
  doneMore:
    "Het jy aan meer gedink — oupagrootjies en oumagrootjies, of 'n ander tak? Vra vir 'n tweede skakel en voeg hulle apart by. Niks hier hoef oorgedoen te word nie.",
  doneView: "Wys my die familieboom",

  welcomeHello: (name) => `Hallo ${name}!`,
  welcomeBody:
    "Jy word genooi om jou familie se inligting vir ons familieboom te deel. Net jou",
  welcomeImmediate: "naaste familie",
  welcomeTime: "Dit neem omtrent 5 minute. Wat jy nie weet nie, slaan sommer oor.",
  welcomeStart: "Kom ons begin →",
  welcomeJustView: "Wys my net die familieboom",

  stepOf: (a, b) => `Stap ${a} van ${b}`,
  back: "← Terug",
  continue: "Gaan voort →",
  remove: "Verwyder",
  change: "Verander",
  yes: "Ja",
  skipThis: "Slaan oor",

  firstName: "Naam",
  surname: "Van",
  surnameHint: "Familievan",
  maidenName: "Nooiensvan",
  maidenHint: "Net as haar van verander het",
  gender: "Geslag",
  female: "Vroulik",
  male: "Manlik",
  birthDate: "Geboortedatum",
  birthDateHint: "As jy net die jaar weet, vul net die jaar in.",
  birthPlace: "Geboorteplek",
  birthPlacePlaceholder: "bv. Kroonstad",
  hasPassed: "Is hulle oorlede?",
  deathDate: "Sterfdatum",
  deathPlace: "Plek van oorlye",
  deathPlacePlaceholder: "bv. Johannesburg",

  dateFormat: "dd / mm / jjjj",
  dateYearOnly: "Net die jaar is reg so.",
  dateClear: "Maak skoon",
  dateNeedYear: "Gee asseblief ten minste 'n jaar.",
  dateBadYear: "Die jaar moet vier syfers wees, soos 1936.",
  dateNeedMonth: "Kies asseblief ook 'n maand, of vee die dag uit.",
  dateBadMonth: "Die maand moet tussen 1 en 12 wees.",
  dateBadDay: "Die dag moet tussen 1 en 31 wees.",
  dateDaysInMonth: (days) => `Daardie maand het net ${days} dae.`,

  matchLinked: (name) => `Reeds in die boom as ${name} — ons sal hulle koppel.`,
  matchUndo: "Ongedaan maak",
  matchChecking: "Ons kyk in die boom…",
  matchMaybe: (name) => `Ons ken dalk reeds vir ${name}:`,
  matchScore: (score) => `${score}% ooreenkoms`,
  matchYes: "Ja, dieselfde persoon",
  matchNo: "Nee, 'n ander persoon",

  stepYou: "Jy",
  stepPartner: "Maat",
  stepParents: "Ouers",
  stepGrandparents: "Grootouers",
  stepChildren: "Kinders",
  stepSiblings: "Broers en susters",
  stepReview: "Nasien",

  photoAdd: "Laai 'n foto op",
  photoReplace: "Verander foto",
  photoRemove: "Verwyder foto",
  photoUploading: "Besig om te stuur…",
  photoFailed: "Die foto is nie opgelaai nie. Probeer asseblief weer.",
  photoHint: "Opsioneel. Enige foto van hulle is wonderlik — veral ou foto's.",
  photoStepTitle: "Foto",

  youTitle: "Oor jou",
  youSubtitle: "Kom ons begin by jou eie besonderhede.",

  partnerTitle: "Jou maat",
  partnerSubtitle:
    "Man, vrou of lewensmaat. Jy kan ook 'n vorige maat byvoeg — dit help ons om die kinders op die regte plek te sit.",
  partnerLabel: "Maat",
  previousPartnerLabel: "Vorige maat",
  relationship: "Julle verhouding",
  statusMarried: "Getroud",
  statusPartners: "Saamlewend",
  statusDivorced: "Geskei",
  statusWidowed: "Wewenaar / weduwee",
  partnerQuestion: "Het jy 'n maat om by te voeg?",
  addAnotherPartner: "+ Voeg nog 'n maat by (byvoorbeeld iemand met wie jy voorheen getroud was)",

  parentsTitle: "Jou ouers",
  parentsSubtitle: "Voeg een of albei by — of slaan oor as jy verkies.",
  parentN: (i) => `Ouer ${i}`,
  addParentN: (i) => `+ Voeg ouer ${i} by`,

  grandparentsTitle: "Jou grootouers",
  grandparentsSubtitle: "Jou ouers se ouers. Selfs net 'n naam en 'n jaar help ontsettend baie.",
  grandparentsNeedParent:
    "Gaan 'n stap terug en voeg eers 'n ouer by — dan kan ons hulle ma en pa op die regte plek sit.",
  parentsOfNamed: (name) => `${name} se ouers`,
  parentsOfIndex: (i) => `Ouer ${i} se ouers`,
  motherLabel: "Ma",
  fatherLabel: "Pa",
  addMother: "+ Voeg ma by",
  addFather: "+ Voeg pa by",
  greatGrandTitle: "Ken jy jou oupagrootjies en oumagrootjies?",
  greatGrandBody:
    "Ons hou hierdie vorm doelbewus kort, daarom stop ons by grootouers. As jy verder terug kan gaan, antwoord vir die persoon wat vir jou hierdie skakel gestuur het en vra vir 'n tweede skakel — dan kan jy daardie ouer geslag op sy eie invul, sonder om hierdie een op te hou.",

  childrenTitle: "Jou kinders",
  childrenSubtitle: "Elke kind, en hoe hulle deel van julle gesin geword het.",
  childN: (i) => `Kind ${i}`,
  otherParentQuestion: "Wie is hulle ander ouer?",
  previousPartnerSuffix: " (vorige maat)",
  someoneElse: "Iemand anders, of ek verkies om nie te sê nie",
  howJoined: "Hoe het hulle deel van julle gesin geword?",
  adoptionBio: "Biologiese kind",
  adoptionAdopted: "Aangeneem",
  adoptionStep: "Stiefkind",
  adoptionFoster: "Pleegkind",
  addChild: "+ Voeg 'n kind by",

  siblingsTitle: "Jou broers en susters",
  siblingsSubtitle: "Broers en susters — ook half- of stiefbroers en -susters.",
  siblingN: (i) => `Broer of suster ${i}`,
  addSibling: "+ Voeg 'n broer of suster by",

  reviewTitle: "Gereed om te stuur",
  reviewSubtitle: "Hier is alles wat jy vir ons gesê het. Tik op 'n deel om dit te gaan verander.",
  reviewEmpty: "Nog niks bygevoeg nie — gaan terug en voeg ten minste jou eie besonderhede by.",
  reviewYou: "Jy",
  willLinkTo: (name) => `Sal aan ${name} gekoppel word (reeds in die boom)`,
  bornOn: (date) => `Gebore ${date}`,
  newToTree: "Nuut in die boom",
  send: "Stuur my inligting 🌳",
  sending: "Besig om te stuur…",

  errNeedFirstName: "Vul asseblief jou naam in.",
  errNeedNameFor: (label) => `Vul asseblief 'n naam in vir die ${label}, of maak die ander blokkies leeg.`,
  errNeedChildName: "Vul asseblief 'n naam vir elke kind in, of verwyder hulle.",
  errNeedSiblingName: "Vul asseblief 'n naam vir elke broer of suster in, of verwyder hulle.",
  errSendFailed: "Kon nie stuur nie — probeer asseblief weer.",
  labelPartnerN: (i) => `maat ${i}`,
  labelParentN: (i) => `ouer ${i}`,
};

export const STRINGS: Record<Lang, Strings> = { en, af };

export const stringsFor = (lang: Lang): Strings => STRINGS[lang] ?? STRINGS.en;
