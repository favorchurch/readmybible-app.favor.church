# Read My Bible

A 28-day Matthew reading challenge for Favor Church Connect Groups. Next.js App
Router, Auth0 session tied to Rock RMS, Supabase Postgres via Drizzle, Redis
cache.

See `intent/SPEC.md`, `intent/GAME.md`, `intent/FLOWS.md`, and `intent/COPY.md`
for the product spec, game rules, user flows, and approved copy.

## Prerequisites

- Node.js `>=22.13.0`
- pnpm (`corepack enable` or `npm i -g pnpm`)

## Quick start

```bash
pnpm install
pnpm dev
```

Copy `.env.local` (not committed) with the variables listed in `intent/SPEC.md`
under Environment variables. `DEV_MOCK_PERSON_ID` lets local dev skip Auth0 and
impersonate a real Rock production PersonId; it is only honored when
`NODE_ENV !== "production"`.

## Scripts

- `pnpm dev` — local dev server
- `pnpm build` — production build (required gate before merging)
- `pnpm lint` — ESLint
- `pnpm test` — Vitest
- `pnpm db:generate` — generate a Drizzle migration from `db/schema.ts`
- `pnpm db:migrate` — apply migrations to `DATABASE_URL_DIRECT`

## Stack

Next.js (App Router, TypeScript), `@auth0/nextjs-auth0` v4, Drizzle ORM with
`postgres-js` against Supabase Postgres schema `readmybible`, node-redis v5 for
caching, Rock RMS REST v1 as the source of truth for people and groups.
