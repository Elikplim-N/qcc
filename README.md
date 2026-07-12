# QCC — Qodesh City Church Management

Single Next.js app covering both the operations side (arrivals, service
attendance, hierarchy management — "Synago") and the member side (directory,
profiles, attendance history — "Poimen") behind one role-aware navigation.
Stack: Next.js 16 (App Router, server actions), Drizzle ORM, Supabase
Postgres, Tailwind 4. Deploys as one Vercel project.

All database tables and enums are prefixed `qcc_` so they can live in a
Supabase database shared with other apps without conflicts.

## Setup

1. **Env** — copy `.env.example` to `.env` and set `DATABASE_URL` to your
   Supabase connection string (Session pooler).
2. **Create tables** — either `npm run db:push` (applies schema directly),
   or run `drizzle/0000_qcc_init.sql` in the Supabase SQL editor.
3. **Seed the Chief Admin** — set `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`
   in `.env`, then `npm run db:seed`.
4. `npm run dev` and sign in at `/login`.

## Deploy to Vercel

Import the repo, set `DATABASE_URL` in the project env vars, deploy. No other
configuration needed (photos are stored as compressed data URLs in the
database, so no storage bucket is required to start).

## Structure & roles

Hierarchy: Member → Bacenta → Governorship → Council → Chief Admin.
Every bacenta/governorship is **Area 1** (attend in person; leader is called
a *Shepherd*, no bussing UI) or **Area 2** (bussed in; leader handles bussing).

| Role | Scope | Notes |
|---|---|---|
| Chief Admin | Church-wide | Everything, incl. councils + all role assignment |
| Council Leader | Their council | Creates governorships/bacentas, assigns governors + bacenta leaders |
| Governor | Their governorship | Creates bacentas, assigns bacenta leaders; full write access |
| Bacenta Leader | Their bacenta | Manages members, records attendance, submits arrivals (bussing forms only if Area 2) |
| Arrivals Admin | Church-wide (functional) | Reviews/approves arrivals, manages code of the day |
| Arrivals Counter | Church-wide (functional) | Enters physical headcounts on submissions |

Promoting a member to any leader role attaches a login to their existing
member record (`qcc_leaders.member_id` is unique) — never a duplicate person.
Permission logic is centralized in `src/lib/permissions.ts`.

## Arrivals flow

- **Pre-Mobilisation** (both areas): proof photo of the code of the day +
  mobilised count. One per bacenta per service week (resubmit overwrites).
  For Area 1 this completes the flow.
- **On-the-Way** (Area 2 only, blocked until Pre-Mob exists): members/visitors
  on board, vehicles (Sprinter/Urvan/Car + leader count), cost, MoMo number.
- **Review** (Arrivals Admin / Governor+ in scope): per-vehicle counter count,
  in-and-out flag, top-up; approve stamps `arrived_at` and writes an audit log.
  Approved submissions are locked for the submitting leader.

The service week is identified by its Sunday date (`src/lib/week.ts`).

## Deliberately out of scope (for now)

Creative arts (ministration/rehearsals), fellowship income reporting,
member self-service accounts, cutoff-time enforcement, R2 photo storage.
