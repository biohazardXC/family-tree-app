# 🌳 Rooted — your family tree app

*(Working title — easy to rename.)*

Welcome! This is your family tree app, rebuilt from scratch on a modern foundation.
The previous version is safely tucked away in `legacy/` for reference — its best idea
(a review queue for family contributions) is coming back in Phase 3 below.

## What's here today (v0.1)

- **Interactive family tree** — pan, zoom, and click anyone
- **People profiles** — names, dates, places, notes
- **Add relatives in one click** — partner, child, parent or sibling of anyone on the tree
- **Search** — find anyone fast, from the tree or the People page
- **A demo family** — try everything risk-free, then hit "Start fresh" to begin your real tree

## Run it on your own computer

```bash
npm install
npm run setup   # creates the local database + demo family
npm run dev     # → http://localhost:3000
```

## The plan (in plain language)

| Phase | What | Status |
|---|---|---|
| 1 | Interactive tree: people, relationships, add/edit, demo family | ✅ Done |
| 2 | Accounts & invites: relatives log in securely; you control who's in | Next |
| 3 | Collaboration: relatives suggest info; a review queue approves it | Planned |
| 4 | Photos & stories: pictures, documents, rich life stories | Planned |
| 5 | Going public: real hosting, real database, payments (if you sell it) | Planned |

## Where things live (for the curious)

- `src/` — the app itself (pages, API, components)
- `src/db/` — the database description & demo data
- `legacy/` — the previous version of the app, kept for reference only

Built with Next.js, React, Drizzle ORM and Tailwind CSS — all free and modern.
