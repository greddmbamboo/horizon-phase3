-- Horizon Phase 3 · Outreach — target schema for a production build.
-- The prototype stores the same shape as one JSON document (0002); column names
-- here match packages/outreach/src/types.ts so moving to these tables is mechanical.
-- Row-level security sketch at the bottom: clients see their engagement only;
-- consultants see everything; private consultant notes never reach clients.

create type company_decision as enum ('waiting','accepted','rejected');
create type strategy_status as enum ('generating','consultant_review','with_client','changes_requested','accepted','failed');
create type email_status as enum ('flagged','with_client','scheduled','sent','failed');
create type batch_status as enum ('preparing','reviewing','sent');
create type flag_type as enum ('unsupported_claim','no_fact');
create type flag_resolution as enum ('rewritten','not_issue','without_fact','source_added','edited');
create type message_direction as enum ('out','in','outside');
create type readiness_status as enum ('not_assessed','needs_review','confirmed','not_ready');
create type contact_outreach as enum ('not_contacted','contacted','replied','on_break','opted_out','declined');

create table engagements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_org_id uuid not null,            -- the client tenant
  client_name text not null,
  footer_address text not null,
  mailbox_domain text not null,           -- e.g. spacelysprockets.mailhl.com
  created_at timestamptz default now()
);

create table people (                     -- app users on either side
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  side text not null check (side in ('client','operator')),
  name text not null, title text, email text not null
);

create table engagement_senders (         -- approved senders per engagement (PRD: sender per contact)
  engagement_id uuid references engagements on delete cascade,
  person_id uuid references people,
  is_default boolean default false,
  primary key (engagement_id, person_id)
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements on delete cascade,
  slug text not null, name text not null, avatar text, readiness text, segment text,
  shared_at timestamptz, version int not null default 1,
  decision company_decision not null default 'waiting',
  decided_at timestamptz, reject_reason text,
  why text,
  unique (engagement_id, slug)
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies on delete cascade,
  name text not null, title text, role_label text,
  email text,                              -- hidden from client until the person replies (PRD C13)
  location text,                           -- US-only outreach: required before contact
  decision_maker boolean default false,
  bio text,
  outreach contact_outreach not null default 'not_contacted'
);

create table strategies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies on delete cascade,
  version int not null,
  status strategy_status not null default 'generating',
  objective text,
  generated_at timestamptz default now(), published_at timestamptz, accepted_at timestamptz,
  client_feedback text, feedback_at timestamptz,
  change_summary text,
  private_notes text,                      -- consultants only
  unique (company_id, version)
);

create table strategy_rows (
  strategy_id uuid references strategies on delete cascade,
  contact_id uuid references contacts,
  "order" int not null,
  objective text, sender_id uuid references people,
  "when" text, when_note text, reason text,
  wave smallint not null default 1,
  primary key (strategy_id, contact_id)
);

create table batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies on delete cascade,
  number int not null, label text,
  status batch_status not null default 'preparing',
  sent_at timestamptz, approved_by uuid references people,
  check (number between 1 and 1000)
);
-- PRD: batches hold at most 20 emails (enforce in the API that adds emails).

create table emails (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies on delete cascade,
  contact_id uuid references contacts,
  batch_id uuid references batches on delete cascade,
  kind text not null check (kind in ('first','followup')),
  subject text not null, objective text, body text not null,
  sender_id uuid references people,
  fact_quote text, fact_source text, fact_date text, fact_url text,
  status email_status not null,
  reviewed boolean not null default false,   -- set after 2s on screen (client)
  sent_at timestamptz, fail_reason text
);

create table email_versions (
  email_id uuid references emails on delete cascade,
  version int not null, body text not null, note text, at timestamptz default now(), by uuid references people,
  primary key (email_id, version)
);

create table email_flags (
  id uuid primary key default gen_random_uuid(),
  email_id uuid references emails on delete cascade,
  type flag_type not null, title text, why text, span text,
  resolved boolean default false, resolution flag_resolution, resolution_note text,
  resolved_at timestamptz, resolved_by uuid references people
);

create table messages (                    -- the shared thread; the client sees the same thread minus private notes
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies on delete cascade,
  contact_id uuid references contacts,
  direction message_direction not null,
  subject text, body text, at timestamptz default now(),
  from_id uuid references people, email_id uuid references emails,
  channel text,                            -- for outside contacts: call, meeting, email
  -- reply analysis (system judgment)
  sentiment text, summary text, intent text, evidence text, next_step text,
  possible_interest boolean, opt_out boolean
);

create table readiness (
  contact_id uuid primary key references contacts on delete cascade,
  status readiness_status not null default 'not_assessed',
  at timestamptz, by uuid references people, reason text
);

create table reply_drafts (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts, in_reply_to uuid references messages,
  subject text, body text, status text check (status in ('draft','rewriting','sent'))
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid references engagements on delete cascade,
  side text not null check (side in ('client','operator')),
  title text, detail text, href text, at timestamptz default now(), read boolean default false
);

create table communication_settings (
  engagement_id uuid primary key references engagements on delete cascade,
  confirmed_at timestamptz, tone text, preferred text, avoid text, proposing text
);

create table sending_state (
  engagement_id uuid primary key references engagements on delete cascade,
  paused boolean default false, paused_by uuid references people, paused_at timestamptz, pause_reason text,
  mailbox text default 'connected' check (mailbox in ('connected','disconnected')),
  last_checked timestamptz, sending_hours text default '8:00–18:00 ET'
);

-- RLS sketch (fill in with your auth claims):
-- alter table companies enable row level security;
-- create policy client_reads_own on companies for select using (engagement_id in (select engagement_id from engagement_members where user_id = auth.uid()));
-- strategies.private_notes and email_flags must be excluded from client-facing views.
