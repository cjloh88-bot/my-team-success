# Architecture

## Stack
- **Frontend:** Next.js (App Router) on Vercel
- **Database + Auth:** Supabase (Postgres + RLS + Auth in lock-down sprint)
- **Styling:** Tailwind CSS

## Now vs Later
| Now | Later |
|---|---|
| Work item CRUD | Auth + per-user isolation |
| Weekly update submission | Role-gated write access |
| Shared live dashboard | AI weekly digest drafts |
| Activity feed | Overdue alerts + Slack integration |

## Key User Action — Flow
1. **Capture:** Team member fills "Submit Weekly Update" form (status, notes, blockers, hours)
2. **Validate:** App checks status transition is legal, required fields present
3. **Store:** `weekly_updates` row inserted; `work_items.status` updated; `activities` row logged
4. **Show:** Dashboard re-fetches and displays new status badge and last-updated timestamp
5. **Rank (later):** Risk score recalculated from days-to-due + blocked flag
6. **Act (later):** AI drafts digest; admin approves before publish

## Layer Order
1. **Data layer first** — tables, RLS, seed data, types
2. **App logic** — forms, status machine, validation, activity logging
3. **Smart features** — risk scoring, AI digest drafts, overdue detection

## Core Without AI
All CRUD, status tracking, update history, and the dashboard work entirely from Postgres queries. AI features are additive and can be disabled without breaking anything.
