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

Two Vercel projects from the same GitHub repo, sharing one Upstash Redis store.

1. **Vercel → Add New → Project →** import the repo. Set **Root Directory** to `web`. Deploy.
2. Import the same repo again with **Root Directory** `portal`. Deploy.
3. **Storage → Create → Upstash for Redis** (free tier). Connect it to **both** projects.
   This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`; the apps switch to Redis automatically.
4. Optional: set `NEXT_PUBLIC_OTHER_APP_URL` on each project to the other one's URL
   (the demo panel links across).
5. Redeploy both so they pick up the new settings.

Without step 3 each app keeps its own temporary data, so changes won't cross over.
Supabase also works: set `HORIZON_STORE=supabase`, `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`, and run `supabase/migrations/0002_prototype_state.sql`.

Note: hofund-intel's rules require approval for new Vercel projects and repos
under Hofund accounts. Add password protection or SSO before sharing widely.

## Going from prototype to product

- **Auth**: there is none. Add Supabase Auth and a role check (client vs
  operator, tenant scoping) at the top of each function in `server-actions.ts`.
- **Data**: the prototype stores the whole engagement as one JSON document with
  version-checked writes. Move to the normalized tables in `0001` by
  reimplementing `store.ts` reads/writes; `actions.ts` keeps the business rules.
- **Live updates**: swap `LiveRefresh` (polling) for Supabase Realtime.
- **Email**: replies, writing checks, AI rewrites and contact lookup are
  templated stand-ins in `actions.ts`. Wire them to the mail provider and models.
