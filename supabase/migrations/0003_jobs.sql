-- =============================================================
-- Odd / standby jobs — a driver on standby does a one-off job and
-- is paid 70% of the job total (the car price), instead of the
-- full daily rate. They log the job total; the app shows their cut.
-- Run this in the Supabase SQL editor (New query → paste → Run).
-- Safe to run on top of the existing schema.
-- =============================================================

create table if not exists public.jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  job_date    date not null default current_date,
  description text,
  total       numeric(10, 2) not null check (total >= 0),  -- the job / car price
  created_at  timestamptz not null default now()
);

create index if not exists jobs_user_date_idx on public.jobs (user_id, job_date);
create index if not exists jobs_date_idx       on public.jobs (job_date);

-- ---------- Row Level Security (mirrors expenses) ----------
alter table public.jobs enable row level security;

-- Drivers see only their own jobs; manager sees all.
drop policy if exists jobs_select on public.jobs;
create policy jobs_select on public.jobs
  for select to authenticated
  using ( user_id = auth.uid() or public.is_manager() );

-- Drivers insert only their own rows.
drop policy if exists jobs_insert on public.jobs;
create policy jobs_insert on public.jobs
  for insert to authenticated
  with check ( user_id = auth.uid() );

-- Drivers delete only their own rows.
drop policy if exists jobs_delete on public.jobs;
create policy jobs_delete on public.jobs
  for delete to authenticated
  using ( user_id = auth.uid() or public.is_manager() );

-- ---------- Grants ----------
grant select, insert, delete on public.jobs to authenticated;
