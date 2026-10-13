# Leapform

Conversational forms — one question at a time. Built with Next.js (App Router),
React 19, Tailwind CSS v4, Drizzle ORM, and Neon serverless Postgres.

## Features (MVP)

- **Builder** (`/forms/[id]`) — question list with add / reorder / duplicate / delete,
  per-type settings (required, placeholder, min/max, rating scale, choices),
  form-level welcome text, completion message, and theme (accent color,
  background, font). Autosaves 700 ms after the last change.
- **Draft / published separation** — edits never touch live forms until you press
  **Publish**. The public page and submissions validate against the *published*
  schema snapshot.
- **Public form** (`/f/[formId]`) — conversational renderer: one question per
  screen, Enter to continue, choice/rating auto-advance, per-field validation,
  progress bar, completion screen. Unpublished forms 404.
- **Responses** (`/forms/[id]/responses`) — table view plus CSV export
  (`Download CSV`, also via `/api/forms/[id]/responses?format=csv`).

Question types: short text, email, number, multiple choice, checkboxes, dropdown,
rating (optionally 0-indexed for NPS-style scales), long text, date.

## Templates

`/templates` ships 11 ready-made questionnaires — Net Promoter Score® (NPS),
product user feedback, consumer purchase feedback, CSAT, employee satisfaction,
event planning, nonprofit, education, market research, brand awareness, and
healthcare. `POST /api/forms {"templateId": "..."}` instantiates any of them
(see `src/lib/templates.ts`).

## Getting started

```bash
npm install
cp .env .env.local   # or edit .env directly (DATABASE_URL points at Neon)
node scripts/db-setup.mjs   # creates forms + responses tables if missing
npm run dev
```

## Structure

```
db/...                      (see src/db)
src/db/schema.ts            Drizzle table definitions
src/db/db.ts                Drizzle client over neon-http
src/lib/form-types.ts       Form schema types + normalizers
src/lib/validate.ts         Server-side submission validation
src/components/FormRunner   Conversational renderer (preview + public)
src/components/Builder      Builder UI (autosaving)
src/app/api/forms           forms CRUD + publish + responses/CSV
src/app/f/[formId]          Public form + submit endpoint
```

## Deployment

Live: **https://leapform.vercel.app** (Vercel, region fra1 — same as the Neon DB).

- GitHub: https://github.com/adeolaalabi2017/leapform — pushes to `main` auto-deploy to production; PRs get preview URLs.
- `DATABASE_URL` is set in the Vercel project settings (Neon `production` branch).

## Environment

- `DATABASE_URL` — Neon Postgres connection string.
  Connection secrets live in `.env` (gitignored).

## Notes

- No auth: this is an internal/personal tool. Anyone with the URL can edit forms.
- Deferred: branching/logic jumps, thank-you-page rules, embed SDK, partial
  responses, analytics.
