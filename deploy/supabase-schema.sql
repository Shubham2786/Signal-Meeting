-- ─────────────────────────────────────────────────────────────
-- Signal Meetings — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).
-- The server connects with the SERVICE ROLE key and writes through these
-- tables. Columns mirror the domain model in /packages/core.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.meetings (
  id          text primary key,
  title       text not null,
  created_at  text not null,
  transcript  text not null,
  source_type text not null default 'text',
  tldr        text not null default '',
  decisions   jsonb not null default '[]'::jsonb
);

create table if not exists public.action_items (
  id            text primary key,
  meeting_id    text not null references public.meetings(id) on delete cascade,
  title         text not null,
  owner         text not null default 'Unassigned',
  due_date      text,
  follow_up     text,
  source_quote  text not null default '',
  confidence    real not null default 0.5,
  status        text not null default 'open',
  confirmed     boolean not null default false,
  duplicate_of  text,
  created_at    text not null,
  updated_at    text not null
);

create index if not exists idx_items_meeting on public.action_items(meeting_id);
create index if not exists idx_items_status  on public.action_items(status);
create index if not exists idx_items_owner   on public.action_items(owner);

-- ── Row Level Security ──────────────────────────────────────────
-- The server uses the SERVICE ROLE key, which BYPASSES RLS. Enabling RLS
-- (with no public policies) is still recommended so the anon/public key
-- cannot read or write these tables directly.
alter table public.meetings     enable row level security;
alter table public.action_items enable row level security;

-- (No policies added on purpose: only the service role — used server-side —
--  may access these tables. Add user-scoped policies here if you later turn
--  on Supabase Auth and want per-user data.)

-- ── Grants ──────────────────────────────────────────────────────
-- The service_role bypasses RLS but still needs table privileges. If you saw
-- "42501: permission denied for table meetings", run this to fix it.
grant usage on schema public to service_role;
grant all privileges on table public.meetings     to service_role;
grant all privileges on table public.action_items to service_role;
-- Make future tables auto-grant to service_role too.
alter default privileges in schema public grant all on tables to service_role;
