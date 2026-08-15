# WishCollective

A 3D "promise wall" — pin your intentions, react to others', and keep the small promises that create lasting change.

## Stack

- **Vite + React 19 + TypeScript (strict)** — UI
- **Three.js** — 3D wall (command-line `WallEngine` singleton)
- **Zustand** — client/UI state · **TanStack Query** — server state
- **supabase-js** — Auth, PostgREST (REST), Realtime, Storage

## Directory layout

```
src/
├─ engine/      WallEngine.ts        (imperative Three.js: wall + cards + raycast)
├─ components/  Sidebar, Dock, Compose, PromisePanel, ModPanel, AllView, ShareModal, ...
├─ hooks/       usePromises, useAuthInit, useSettings, useCategories
├─ store/       useAppStore.ts       (Zustand)
├─ i18n/        en.ts, zh.ts         (type-safe dictionaries)
├─ lib/         api.ts, types.ts, papers.ts, categories.ts, filter.ts, shareCard.ts, supabase.ts
└─ styles/      tokens.css           (design tokens)
supabase/migrations/                 (versioned schema)
scripts/        admin.mjs, reload.mjs
```

## Setup

```bash
pnpm install
cp .env.example .env.local   # then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
pnpm dev
```

Without env vars the app runs in demo mode (seed data, no network).

## Database

Migrations live in `supabase/migrations/`. Apply them to your Supabase project:

```bash
pnpm exec supabase db push --db-url "postgresql://...session-pooler-URI..."
```

`db push` over a direct/pooler connection does **not** refresh PostgREST's schema
cache, so reload it once after pushing:

```bash
DATABASE_URL="postgresql://..." node scripts/reload.mjs
```

Admin helpers (require `DATABASE_URL`):

```bash
DATABASE_URL="postgresql://..." node scripts/admin.mjs list
DATABASE_URL="postgresql://..." node scripts/admin.mjs admin you@example.com
```

## Build & deploy

```bash
pnpm build      # type-check + bundle → dist/
pnpm preview    # serve the production build locally
```

`dist/` is a static site — serve it with nginx (see the old deployment) and keep
`/` → `index.html` fallback for the SPA.

## Auth notes

- Email signup requires "Enable Email provider" and "Allow new users to sign up"
  in Supabase → Authentication → Sign In / Providers → Email.
- Turn off "Confirm email" for local testing (avoids the free-tier email rate limit).
