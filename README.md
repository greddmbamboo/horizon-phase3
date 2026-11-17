# Hofund Horizon · Phase 3 Outreach

Two working Next.js apps built from the **Phase 3 Comprehensive** Figma page
(file `p1lYwjI9Hg5ST92PRxjg3H`), sharing one data store so a client user and an
operator see each other's changes.

| App | Folder | Local URL | Who uses it |
|---|---|---|---|
| Operator app | `web/` | http://localhost:3000 | Hofund consultants (Addler) |
| Client portal | `portal/` | http://localhost:3001 | Spacely Sprockets (Rachel) |

Stack matches `hofund-intel`: Next.js 15 App Router, React 19, TypeScript,
Tailwind 3.4 with a shared preset, Radix dialogs, lucide-react, Supabase, npm
workspaces. Fonts (Montserrat, Source Serif 4) are bundled, not fetched.

## Run it locally

```bash
npm install
npm run dev            # starts both apps (3000 + 3001)
npm run reset-data     # back to the seeded demo state
```

Locally both apps read and write `.data/state.json` at the repo root, so two
browser windows behave like two people on the real site. Pages refresh every
4 seconds to pick up the other side's changes.

## The happy path (verified end to end)

1. **Client** → Company Review → Finn's Fancy Fences → *Accept Company*
2. **Operator** → Outreach Queue → Strategy Waiting on You → *Publish for Client Review*
3. **Client** → Outreach → Strategy → *Accept Strategy* (first emails are written; Marcus's is flagged)
4. **Operator** → Flagged Emails → fix both issues → *Send to Client for Review*
5. **Client** → Review & Send → review both → *Approve & Send 2 Emails*
6. **Demo panel** (bottom of either sidebar) → Finn replies "Interested"
7. **Operator** → Possible Acquisition Interest → *Confirm Ready*
8. **Client** → Conversations → *Reply* → *Approve & Send Reply*

The **Demo** panel is prototype-only. It fakes things that happen outside the
app (replies arriving, time passing) and resets data. Remove `Demo.tsx` from
both apps' layouts before this becomes the product.

## Seeing the other states

Everything in the Figma "Phase 3 Comprehensive" page that the prototype covers can be reached from the running apps:

| State | How to see it |
|---|---|
| Loading (C-01a, C-04b, C-16c, O-02c) | Add `?simulate=slow` to Opportunity Overview, Outreach, Relationship Summary or Outreach Queue |
| Error (C-01b, C-04c, C-07c, C-16c·2, O-02c·2) | Add `?simulate=error` to those pages, or to a company's Review & Send. *Try Again* reloads without it |
| Accept / reject an update (C-02a) | Client → Company Review → Summit Perimeter Co. (version 2 is waiting) |
| Withdraw acceptance, accept again (C-02a) | Client → an accepted company → *Withdraw Acceptance* |
| Remove from client view (C-02a) | Operator → Sharing and Decisions → *Remove* |
| Overlap, add person, location, regenerate (O-03b/d/e/g) | Operator → a strategy waiting on you (accept Finn’s Fancy Fences first) |
| Edit directly, rewrite whole email, undo (O-05c/d) | Operator → Flagged Emails → Marcus Reyes |
| One email fails to send (C-10a) | Demo panel → *Make Marcus’s address bounce*, then approve the batch |
| Insights on the Summary tab (C-15a) | After Finn replies, Demo panel → *Share insights about Finn* |
| Customize the summary (C-16b) | Client → Outreach → Relationship Summary → *Customize* |
| Private notes (O-10d) | Operator → Possible Acquisition Interest → a person → *Add Private Note* |

`?simulate=` and the Demo panel are prototype-only. The insights button stands in for an operator screen that isn't designed yet.

## Code map

```
packages/outreach   Domain model, seed data, every state change, persistence
  types.ts            HorizonState and all statuses
  seed.ts             Spacely Sprockets / Fencing Acquisitions sample data
  actions.ts          Pure functions: acceptCompany, publishStrategy, resolveFlag, approveBatch …
  select.ts           Read helpers + formatting
  store.ts            FileStore (local) / SupabaseStore (deployed)
  server-actions.ts   Next.js server actions used by both apps' forms
packages/ui         Shared components (Pill, Banner, Table, Modal …) + Tailwind preset
web/                Operator app (Baltic theme)
portal/             Client portal (violet tenant theme)
supabase/migrations
  0001_outreach_schema.sql   Normalized production schema (target)
  0002_prototype_state.sql   Single-row JSON table the prototype uses today
```

Modals and tabs are driven by the URL (`?email=…`, `?dialog=…`), so every
state is linkable and the back button works.

## Deploying to Vercel

The two apps never call each other; they only share the data store. Either layout works.

### Two Vercel projects (Hofund's setup)

| Project | Root Directory | Settings |
|---|---|---|
| Operator | `web` | `NEXT_PUBLIC_OTHER_APP_URL` = the portal's address |
| Client portal | `portal` | `NEXT_PUBLIC_OTHER_APP_URL` = the operator app's address |

Leave `PORTAL_BASE_PATH` unset, so the portal is served at its own root.
The root `vercel.json` is ignored in this layout.

### One Vercel project (`vercel.json` at the repo root)

Root Directory left at the repo root. `/portal` and `/portal/*` go to the portal service,
everything else to the operator app. Set **`PORTAL_BASE_PATH=/portal`** on the project.

### Shared data (either layout)

Both apps must point at the same store, or changes won't cross over:

- **Upstash Redis**: set `KV_REST_API_URL` and `KV_REST_API_TOKEN` (the Vercel Marketplace adds them).
  Both apps switch to Redis automatically.
- **Supabase**: set `HORIZON_STORE=supabase`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`,
  and run `supabase/migrations/0002_prototype_state.sql`.

Without either, each app keeps its own temporary copy.
There's no login yet: add Vercel password protection or SSO before sharing widely.

## Going from prototype to product

- **Auth**: there is none. Add Supabase Auth and a role check (client vs
  operator, tenant scoping) at the top of each function in `server-actions.ts`.
- **Data**: the prototype stores the whole engagement as one JSON document with
  version-checked writes. Move to the normalized tables in `0001` by
  reimplementing `store.ts` reads/writes; `actions.ts` keeps the business rules.
- **Live updates**: swap `LiveRefresh` (polling) for Supabase Realtime.
- **Email**: replies, writing checks, AI rewrites and contact lookup are
  templated stand-ins in `actions.ts`. Wire them to the mail provider and models.
