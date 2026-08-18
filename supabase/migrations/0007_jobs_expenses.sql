-- Per car jobs update: add expenses column.
-- Company covers expenses; driver earns 60% of (total - expenses).
-- Run in Supabase SQL editor.

alter table public.jobs
  add column if not exists expenses numeric(10, 2) not null default 0 check (expenses >= 0);
