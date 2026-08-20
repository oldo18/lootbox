-- Supabase schema for the diploma survey.
-- 1) Create tables
create extension if not exists pgcrypto;

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  participant_id text not null unique,
  study_id text not null,
  currency text,
  amount_eur numeric,
  created_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  payload jsonb not null
);

create table if not exists public.screened_out (
  id uuid primary key default gen_random_uuid(),
  study_id text,
  reason text not null,
  age integer,
  created_at timestamptz not null default now()
);

create table if not exists public.raffle_entries (
  id uuid primary key default gen_random_uuid(),
  study_id text,
  email text not null,
  created_at timestamptz not null default now()
);

-- 2) Indexes
create index if not exists survey_responses_study_id_idx on public.survey_responses (study_id);
create index if not exists surveyed_out_study_id_idx on public.screened_out (study_id);
create index if not exists raffle_entries_study_id_idx on public.raffle_entries (study_id);

-- 3) RLS
alter table public.survey_responses enable row level security;
alter table public.screened_out enable row level security;
alter table public.raffle_entries enable row level security;

create policy if not exists "Allow anonymous inserts to survey responses"
on public.survey_responses
for insert
with check (true);

create policy if not exists "Allow anonymous inserts to screened out"
on public.screened_out
for insert
with check (true);

create policy if not exists "Allow anonymous inserts to raffle entries"
on public.raffle_entries
for insert
with check (true);

-- 4) Optional public reads only for testing (remove in production if you prefer private access)
create policy if not exists "Allow public read of survey responses"
on public.survey_responses
for select
using (true);

create policy if not exists "Allow public read of screened out"
on public.screened_out
for select
using (true);

create policy if not exists "Allow public read of raffle entries"
on public.raffle_entries
for select
using (true);
