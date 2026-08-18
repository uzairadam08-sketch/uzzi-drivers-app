-- Add daily_rate_enabled flag to profiles.
-- Default false — only senior drivers approved by manager can clock in for daily rate.
-- Run in Supabase SQL editor.

alter table public.profiles
  add column if not exists daily_rate_enabled boolean not null default false;

-- Enable for the 3 senior drivers: Imran Qaasim, Ali Hamza, Alusine
update public.profiles set daily_rate_enabled = true where id in (
  'f99feb95-ec67-43f8-8b5e-837032026194', -- Imran Qaasim
  'fe12853e-8172-4f14-b991-4a1adefd3f1c', -- Ali Hamza
  'b7148eb8-2bec-4d4d-b676-f0a5be38ba57'  -- Alusine
);
