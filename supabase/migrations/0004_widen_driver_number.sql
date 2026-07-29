-- Allow more than 10 drivers. Widen the driver_number check from 1..10 to 1..50.
alter table profiles drop constraint if exists profiles_driver_number_check;
alter table profiles add constraint profiles_driver_number_check
  check (driver_number between 1 and 50);
