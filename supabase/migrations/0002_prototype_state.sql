-- Prototype persistence: one shared JSON document both apps read and write.
-- Used when HORIZON_STORE=supabase. Replace with the normalized tables in
-- 0001_outreach_schema.sql when this becomes a production build.
create table if not exists public.horizon_prototype_state (
  id text primary key,
  version bigint not null default 1,
  doc jsonb not null,
  updated_at timestamptz not null default now()
);
-- Only the server (service role) touches this table; no client access.
alter table public.horizon_prototype_state enable row level security;
