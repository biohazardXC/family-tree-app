# 🌳 Rooted — your family tree app

*(Working title — easy to rename.)*

Welcome! This is your family tree app, rebuilt from scratch on a modern foundation.
The previous version is safely tucked away in `legacy/` for reference.

## What's here today (v0.2 — "The Grandma Update")

**For the family admin (you):**
- **Interactive family tree** — pan, zoom, click anyone; edit details, add relatives, search
- **Invite links** — no passwords: generate a personal link, send it via WhatsApp
- **Review queue** — approve, link or skip each submitted person; the app stitches
  everything into the tree, and flags conflicting details for you to pick a side
- **Gaps report** — who's missing dates, places or parents, plus basic conflict checks

**For invitees (grandma-approved):**
- **A dead-simple form** — big buttons, plain language, every step skippable:
  you → partner → parents → children → siblings
- **Smart duplicate detection** — types "Johan Mokoena" and the app notices that's
  probably "Johannes Mokoena" already in the tree (survives typos, spelling variants
  and maiden names) and offers to link instead of duplicate
- **Read-only tree view** — they can peek at the whole tree without touching it

**Also new:**
- **Adoption support** — every parent–child link can be biological, adopted, step or
  foster; children with no parents at all are fine too; adopted children are flagged
  on the tree

## Run it on your own computer

**You'll need [Node.js](https://nodejs.org) 22 or newer** — download the "LTS" version from nodejs.org and install it (one time only).

```bash
npm install
npm run setup   # creates the local database + demo family
npm run dev     # → http://localhost:3000
```

To stop the app, press `Ctrl+C` in the terminal. To run it again later: just `npm run dev`.

## Try the full collaboration flow (2 minutes)

1. Open the app → **Review** tab → **Invites** → create one for "Aunty Nellie"
2. Copy the link (or use the WhatsApp button) and open it in another tab
3. Fill in a few family members — try typing "Johan Mokoena" as a parent and watch
   the duplicate detection kick in
4. Submit → back in the first tab, **Review → Submissions** → open Nellie's submission
5. For each person choose *new*, *same as…*, or *skip* → **Approve & add to tree**

## The plan (in plain language)

| Phase | What | Status |
|---|---|---|
| 1 | Interactive tree: people, relationships, add/edit, demo family | ✅ Done |
| 2 | Family collaboration: invites, simple form, review queue, adoption, gaps | ✅ Done |
| 3 | Accounts for the admin + putting the app online (real URLs for invites) | Next |
| 4 | Photos & stories: pictures, documents, rich life stories | Planned |
| 5 | Going public: payments, multiple families (if you sell it) | Planned |

## Where things live (for the curious)

- `src/` — the app itself (pages, API, components)
- `src/db/` — the database description & demo data
- `src/lib/matching.ts` — the fuzzy name-matching engine
- `legacy/` — the previous version of the app, kept for reference only

Built with Next.js, React, Drizzle ORM and Tailwind CSS — all free and modern.

## Deployment (Vercel + Turso)

The app talks to SQLite through libSQL, so the same code runs on a local file
and on a hosted Turso database.

| Environment | `DATABASE_URL` | `DATABASE_AUTH_TOKEN` |
| --- | --- | --- |
| Local dev | unset (defaults to `file:./data/dev.db`) | unset |
| Vercel | `libsql://<your-db>.turso.io` | Turso auth token |

Create the tables and seed the demo family (works locally or remotely):

```bash
npm run setup                 # local file
DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... npm run setup   # Turso
```
