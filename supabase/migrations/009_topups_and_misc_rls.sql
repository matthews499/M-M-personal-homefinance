-- ── Migration 009: Joint top-ups, personal_misc RLS fix, savings schema guards ──
--
-- 1. personal_misc_expenses — split the FOR ALL policy so INSERT allows
--    any authenticated user (needed when joint personal misc inserts rows
--    for both Matthew and Maddy from one client session).
--
-- 2. joint_topups — new table for joint pot top-ups that increase available
--    budget without counting as spending.
--
-- 3. personal_savings_pots — idempotent guards in case migration 007 was
--    only partially applied (add mode, monthly_commitment; drop not null
--    on target_amount/target_date).
-- ────────────────────────────────────────────────────────────────────────────


-- ── 1. Fix personal_misc_expenses RLS ───────────────────────────────────────

-- Drop all existing policies first (CREATE POLICY does not support IF NOT EXISTS)
drop policy if exists "personal_misc_auth"   on public.personal_misc_expenses;
drop policy if exists "personal_misc_select" on public.personal_misc_expenses;
drop policy if exists "personal_misc_update" on public.personal_misc_expenses;
drop policy if exists "personal_misc_delete" on public.personal_misc_expenses;
drop policy if exists "personal_misc_insert" on public.personal_misc_expenses;

-- Users can only read / update / delete their OWN records
create policy "personal_misc_select" on public.personal_misc_expenses
  for select using (auth.uid() = user_id);

create policy "personal_misc_update" on public.personal_misc_expenses
  for update using (auth.uid() = user_id);

create policy "personal_misc_delete" on public.personal_misc_expenses
  for delete using (auth.uid() = user_id);

-- Any authenticated user can INSERT (required for joint-personal-misc and top-up
-- which must create rows for the OTHER user without an extra service-role call)
create policy "personal_misc_insert" on public.personal_misc_expenses
  for insert with check (auth.role() = 'authenticated');


-- ── 2. joint_topups ──────────────────────────────────────────────────────────
--
--    A top-up adds money from personal disposable to the joint pot.
--    Unlike a misc expense it is NOT counted as spending:
--      • joint budget total   INCREASES by the top-up amount
--      • joint remaining      INCREASES by the top-up amount
--      • each user's personal disposable DECREASES by their share
--      • a task is created for each user to physically transfer their share
--
--    period: the pay-cycle period in which this top-up occurred ('YYYY-MM').
--    custom_split_ratio: null = use global matthew_split_ratio; 0-1 = Matthew's share.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.joint_topups (
  id                 uuid          primary key default gen_random_uuid(),
  amount             numeric(10,2) not null check (amount > 0),
  expense_date       date          not null,
  note               text          not null default '',
  period             text          not null,
  custom_split_ratio numeric(5,4)  default null
    check (custom_split_ratio is null
        or (custom_split_ratio >= 0 and custom_split_ratio <= 1)),
  created_by         uuid          not null references public.profiles(id) on delete cascade,
  created_at         timestamptz   not null default now()
);

alter table public.joint_topups enable row level security;

drop policy if exists "topup_select_auth" on public.joint_topups;
drop policy if exists "topup_insert_auth" on public.joint_topups;
drop policy if exists "topup_delete_own"  on public.joint_topups;

-- Both users can see all top-ups
create policy "topup_select_auth" on public.joint_topups
  for select using (auth.role() = 'authenticated');

-- Any authenticated user can insert (same pattern as joint_misc_expenses)
create policy "topup_insert_auth" on public.joint_topups
  for insert with check (auth.role() = 'authenticated');

-- Only the creator can delete
create policy "topup_delete_own" on public.joint_topups
  for delete using (auth.uid() = created_by);

-- Fast period-based lookups
create index if not exists joint_topups_period_idx
  on public.joint_topups (period, expense_date);


-- ── 3. personal_savings_pots — idempotent schema guards ─────────────────────

alter table public.personal_savings_pots
  add column if not exists mode text not null default 'targeted'
    check (mode in ('targeted', 'open')),
  add column if not exists monthly_commitment numeric(10,2) default null;

-- Safe to run even if columns are already nullable
alter table public.personal_savings_pots
  alter column target_amount drop not null;

alter table public.personal_savings_pots
  alter column target_date drop not null;
