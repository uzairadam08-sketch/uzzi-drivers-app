-- =============================================================
-- Uzzi Driver Clock-In & Wages — schema + Row Level Security
-- =============================================================
-- Run this in the Supabase SQL editor, or via the Supabase CLI
-- (supabase db push). It is idempotent-ish: safe to read top to
-- bottom on a fresh project.
-- =============================================================

-- ---------- Tables -------------------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  driver_number int  unique check (driver_number between 1 and 10),
  display_name  text,
  role          text not null default 'driver' check (role in ('driver', 'manager')),
  created_at    timestamptz not null default now()
);

create table if not exists public.clockins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  work_date  date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, work_date)            -- a driver can't double-clock a day
);

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  expense_date date not null default current_date,
  description  text not null,
  amount       numeric(10, 2) not null check (amount >= 0),
  created_at   timestamptz not null default now()
);

create table if not exists public.settings (
  id          int primary key default 1 check (id = 1),  -- single-row table
  daily_rate  numeric(10, 2) not null default 100,
  updated_at  timestamptz not null default now()
);

-- Ensure the single settings row exists.
insert into public.settings (id, daily_rate)
values (1, 100)
on conflict (id) do nothing;

-- Helpful indexes for the dashboards.
create index if not exists clockins_user_date_idx on public.clockins (user_id, work_date);
create index if not exists clockins_date_idx       on public.clockins (work_date);
create index if not exists expenses_user_date_idx  on public.expenses (user_id, expense_date);

-- ---------- Auto-create a profile on signup ------------------
-- Every new auth user gets a 'driver' profile by default.
-- You promote your own account to 'manager' manually (see README).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email), 'driver')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Role helper (avoids RLS recursion) ---------------
-- SECURITY DEFINER so it reads profiles without triggering the
-- profiles RLS policy (which would recurse).

create or replace function public.is_manager()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager'
  );
$$;

-- =============================================================
-- Row Level Security — the privacy guarantee
-- =============================================================

alter table public.profiles enable row level security;
alter table public.clockins enable row level security;
alter table public.expenses enable row level security;
alter table public.settings enable row level security;

-- ---------- profiles ----------
-- Driver reads own profile; manager reads all.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using ( id = auth.uid() or public.is_manager() );

-- A user may update their own display_name (role/driver_number are
-- managed by you/the seed). Manager may update any profile.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using ( id = auth.uid() or public.is_manager() )
  with check ( id = auth.uid() or public.is_manager() );

-- ---------- clockins ----------
-- Drivers see only their own; manager sees all.
drop policy if exists clockins_select on public.clockins;
create policy clockins_select on public.clockins
  for select to authenticated
  using ( user_id = auth.uid() or public.is_manager() );

-- Drivers insert only their own rows.
drop policy if exists clockins_insert on public.clockins;
create policy clockins_insert on public.clockins
  for insert to authenticated
  with check ( user_id = auth.uid() );

-- Drivers delete only their own rows (the "undo today" action).
drop policy if exists clockins_delete on public.clockins;
create policy clockins_delete on public.clockins
  for delete to authenticated
  using ( user_id = auth.uid() );

-- ---------- expenses ----------
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses
  for select to authenticated
  using ( user_id = auth.uid() or public.is_manager() );

drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses
  for insert to authenticated
  with check ( user_id = auth.uid() );

drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses
  for delete to authenticated
  using ( user_id = auth.uid() );

-- ---------- settings ----------
-- Any logged-in user may read the rate (to compute earnings)…
drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings
  for select to authenticated
  using ( true );

-- …but only the manager may change it.
drop policy if exists settings_update on public.settings;
create policy settings_update on public.settings
  for update to authenticated
  using ( public.is_manager() )
  with check ( public.is_manager() );

-- ---------- Table grants -------------------------------------
-- RLS is the real guard; these grants let the authenticated role
-- reach the tables at all. anon gets nothing (no public access).

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, delete on public.clockins to authenticated;
grant select, insert, delete on public.expenses to authenticated;
grant select, update on public.settings to authenticated;
