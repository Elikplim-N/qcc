# QCC — Qodesh City Church Management

Monorepo with two apps over one shared Supabase database (same pattern as the
reference project):

- **Synago** (`apps/synago`, port 3001) — operations & leadership: arrivals
  (Pre-Mobilisation / On-the-Way / approval & counter counts), service
  attendance, hierarchy management, role assignment, arrivals settings.
- **Poimen** (`apps/poimen`, port 3000) — member-centric: directory,
  individual profiles with attendance history, add/edit members. Used by
  leaders; members have no self-service login.

Shared packages:

- `packages/db` — Drizzle schema + client. All tables/enums prefixed `qcc_`
  so they can live in a Supabase database shared with other apps.
- `packages/core` — auth (cookie sessions, scrypt passwords), centralized
  permissions (`permissions.ts` — the single "can this leader act on this
  unit" module used by both apps), scope resolution, week helpers.
- `packages/ui` — shell/navigation, shared components, shared CSS.

Stack: Next.js 16 (App Router, server actions), Drizzle ORM, Supabase
Postgres, Tailwind 4.

## Setup

1. Copy `.env.example` to `.env` at the repo root and set `DATABASE_URL`
   (Supabase Session pooler connection string).
2. `npm install`
3. Create tables: `npm run db:push` — or run `drizzle/0000_qcc_init.sql` in
   the Supabase SQL editor.
4. Seed the Chief Admin: set `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`
   in `.env`, then `npm run db:seed`.
5. `npm run dev:synago` and/or `npm run dev:poimen`, sign in at `/login`.

The same username/password works in both apps (one `qcc_leaders` account per
member); each app keeps its own session cookie.

## Deploy to Vercel (two projects)

Create **two** Vercel projects from this repo:

| Project | Root Directory | Env vars |
|---|---|---|
| qcc-synago | `apps/synago` | `DATABASE_URL` |
| qcc-poimen | `apps/poimen` | `DATABASE_URL` |

Vercel detects the npm workspaces automatically; no other configuration is
needed (photos are stored as compressed data URLs, so no storage bucket is
required to start).

## Structure & roles

Hierarchy: Member → Bacenta → Governorship → Council → Chief Admin.
Every bacenta/governorship is **Area 1** (attend in person; leader is called
a *Shepherd*, no bussing UI) or **Area 2** (bussed in; leader handles bussing).

| Role | Scope | Notes |
|---|---|---|
| Chief Admin | Church-wide | Everything, incl. councils + all role assignment |
| Council Leader | Their council | Creates governorships/bacentas, assigns governors + bacenta leaders |
| Governor | Their governorship | Creates bacentas, assigns bacenta leaders; full write access |
| Bacenta Leader | Their bacenta | Manages members (Poimen), records attendance, submits arrivals (bussing forms only if Area 2) |
| Arrivals Admin | Church-wide (functional) | Reviews/approves arrivals, manages code of the day |
| Arrivals Counter | Church-wide (functional) | Enters physical headcounts on submissions |

Promoting a member to any leader role attaches a login to their existing
member record (`qcc_leaders.member_id` is unique) — never a duplicate person.

## Arrivals flow (Synago)

- **Pre-Mobilisation** (both areas): proof photo of the code of the day +
  mobilised count. One per bacenta per service week (resubmit overwrites).
  For Area 1 this completes the flow.
- **On-the-Way** (Area 2 only, blocked server-side until Pre-Mob exists):
  members/visitors on board, vehicles (Sprinter/Urvan/Car + leader count),
  cost, MoMo number.
- **Review** (Arrivals Admin / Governor+ in scope): per-vehicle counter
  count, in-and-out flag, top-up; approve stamps `arrived_at` and writes an
  audit log. Approved submissions are locked for the submitting leader.
- The monitor dashboard shows Area 2 bussing status **and** Area 1
  pre-mobilisation status.

The service week is identified by its Sunday date (`packages/core/src/week.ts`).

## Deliberately out of scope (for now)

Creative arts (ministration/rehearsals), fellowship income reporting,
member self-service accounts, cutoff-time enforcement, R2 photo storage.
