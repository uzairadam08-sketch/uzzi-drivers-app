-- =============================================================
-- 0006_adjustments — one-off pay adjustments / carry-overs
-- =============================================================
-- A manager can attach an extra amount to a driver for a specific
-- month (e.g. unpaid days carried over from a previous month).
-- It only affects the month it is tagged to, so it naturally
-- "resets" the following month like everything else.
-- Run this in the Supabase SQL editor.
-- =============================================================

create table if not exists public.adjustments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  month      date not null,                 -- first day of the month it applies to, e.g. 2026-07-01
  amount     numeric(10, 2) not null,       -- positive = extra owed to the driver
  note       text,                          -- e.g. "Carried over from June"
  created_at timestamptz not null default now()
);

create index if not exists adjustments_user_month_idx
  on public.adjustments (user_id, month);

alter table public.adjustments enable row level security;

-- Drivers see their own; managers see all.
drop policy if exists adjustments_select on public.adjustments;
create policy adjustments_select on public.adjustments
  for select to authenticated
  using ( user_id = auth.uid() or public.is_manager() );

-- Only managers create / change / remove adjustments.
drop policy if exists adjustments_insert on public.adjustments;
create policy adjustments_insert on public.adjustments
  for insert to authenticated
  with check ( public.is_manager() );

drop policy if exists adjustments_update on public.adjustments;
create policy adjustments_update on public.adjustments
  for update to authenticated
  using ( public.is_manager() )
  with check ( public.is_manager() );

drop policy if exists adjustments_delete on public.adjustments;
create policy adjustments_delete on public.adjustments
  for delete to authenticated
  using ( public.is_manager() );

grant select, insert, update, delete on public.adjustments to authenticated;
