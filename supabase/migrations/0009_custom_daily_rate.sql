-- Per-driver daily rate override. Null = use global rate from settings table.
alter table public.profiles
  add column if not exists custom_daily_rate numeric(10,2) default null;

-- Ali Hamza is on £120/day
update public.profiles
  set custom_daily_rate = 120
  where id = 'fe12853e-8172-4f14-b991-4a1adefd3f1c';
