-- =============================================================
-- Manager pay log — managers record their own pay as they go.
-- Run this in the Supabase SQL editor (New query → paste → Run).
-- Safe to run on top of the existing schema.
-- =============================================================

create table if not exists public.manager_pay (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  pay_date   date not null default current_date,
  amount     numeric(10, 2) not null check (amount >= 0),
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists manager_pay_user_date_idx
  on public.manager_pay (user_id, pay_date);

-- ---------- Row Level Security ----------
alter table public.manager_pay enable row level security;

-- A manager sees their own pay rows; managers may also see all.
drop policy if exists manager_pay_select on public.manager_pay;
create policy manager_pay_select on public.manager_pay
  for select to authenticated
  using ( user_id = auth.uid() or public.is_manager() );

-- A manager logs pay only against their own account.
drop policy if exists manager_pay_insert on public.manager_pay;
create policy manager_pay_insert on public.manager_pay
  for insert to authenticated
  with check ( user_id = auth.uid() and public.is_manager() );

-- A manager removes their own entries (or any manager can tidy up).
drop policy if exists manager_pay_delete on public.manager_pay;
create policy manager_pay_delete on public.manager_pay
  for delete to authenticated
  using ( user_id = auth.uid() or public.is_manager() );

-- ---------- Grants ----------
grant select, insert, delete on public.manager_pay to authenticated;
