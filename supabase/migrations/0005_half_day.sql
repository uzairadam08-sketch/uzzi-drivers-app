-- =============================================================
-- Half-day clock-ins
-- =============================================================
-- Adds a `half_day` flag to clockins. A normal clock-in stays a
-- full day (half_day = false → paid the full daily rate). A
-- half-day clock-in (half_day = true) is paid half the daily rate.
-- The existing unique (user_id, work_date) still applies: a driver
-- clocks in once per day, either a full day or a half day.
-- Run this in the Supabase SQL editor.
-- =============================================================

alter table public.clockins
  add column if not exists half_day boolean not null default false;
