-- ============================================================
-- Run this in the Supabase SQL editor AFTER creating both
-- user accounts via Authentication > Users in the dashboard.
-- Salary and pay_date are left as schema defaults (0 and 1)
-- and will be set by each user on first login in the app.
--
-- Matthew: sandersonmatthew875@gmail.com
-- Maddy:   maddycarltonware@gmail.com
-- ============================================================

insert into public.profiles (id, name)
values
  ('c722d728-5abe-41fe-9965-3f5d5c69a891', 'Matthew'),
  ('45b7ef92-2b47-47a8-ae2b-f7348271b62c', 'Maddy');
