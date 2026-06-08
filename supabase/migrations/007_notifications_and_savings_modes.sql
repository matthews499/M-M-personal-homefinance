-- ── Migration 007: App notifications, savings pot modes, misc deduction types ──

-- ────────────────────────────────────────────────────────────────
-- 1. personal_savings_pots — support open (no-target) mode
--
--    mode:
--      'targeted' (default / existing) — has target_amount + target_date,
--                  monthly contribution is auto-calculated, progress bar shown
--      'open'     — has monthly_commitment only, no target or end date,
--                  running total shown without a progress bar
--
--    target_amount and target_date become nullable because open-mode pots
--    do not have them.  All existing rows are targeted mode so no data loss.
-- ────────────────────────────────────────────────────────────────

alter table public.personal_savings_pots
  add column if not exists mode               text    not null default 'targeted'
    check (mode in ('targeted', 'open')),
  add column if not exists monthly_commitment numeric(10,2) default null;

-- Make target_amount / target_date nullable (required for open-mode pots)
alter table public.personal_savings_pots
  alter column target_amount drop not null,
  alter column target_date   drop not null;


-- ────────────────────────────────────────────────────────────────
-- 2. joint_misc_expenses — deduction type
--
--    deduction_type:
--      'variable' (default / existing) — amount is spread proportionally
--                  across joint variable categories by their budget size
--      'personal' — amount is split between Matthew and Maddy by the
--                  global split ratio (or a custom ratio stored here),
--                  and a task is created for each user
--
--    custom_split_ratio:
--      null   → use the global matthew_split_ratio from app_settings
--      0–1    → Matthew's share of the expense; Maddy gets (1 − ratio)
-- ────────────────────────────────────────────────────────────────

alter table public.joint_misc_expenses
  add column if not exists deduction_type     text    not null default 'variable'
    check (deduction_type in ('variable', 'personal')),
  add column if not exists custom_split_ratio numeric(5,4) default null
    check (custom_split_ratio is null
        or (custom_split_ratio >= 0 and custom_split_ratio <= 1));


-- ────────────────────────────────────────────────────────────────
-- 3. app_notifications — in-app bell notifications
--
--    type values:
--      'disposable_50'      — user has spent 50% of personal disposable
--      'disposable_80'      — user has spent 80% of personal disposable
--      'disposable_100'     — user has spent 100% of personal disposable
--      'variable_budget_80' — joint variable total has hit 80% of combined budget
--      'task_due_soon'      — a task is due tomorrow
--
--    dedup_key:
--      Unique string that prevents the same alert being created twice.
--      Pattern by type:
--        disposable_50  → 'disp_50:{user_id}:{period}'
--        disposable_80  → 'disp_80:{user_id}:{period}'
--        disposable_100 → 'disp_100:{user_id}:{period}'
--        variable_budget_80 → 'varbudget_80:{period}'  (one per period, both users get a row each)
--        task_due_soon  → 'task_due:{task_id}'
--
--    RLS:
--      SELECT / UPDATE (mark read): own rows only
--      INSERT: any authenticated user — required because joint budget alerts
--              create notification rows for both users from one client
-- ────────────────────────────────────────────────────────────────

create table if not exists public.app_notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  type        text        not null
                check (type in (
                  'disposable_50',
                  'disposable_80',
                  'disposable_100',
                  'variable_budget_80',
                  'task_due_soon'
                )),
  title       text        not null,
  body        text        not null default '',
  dedup_key   text        unique,
  read        boolean     not null default false,
  read_at     timestamptz default null,
  created_at  timestamptz not null default now()
);

alter table public.app_notifications enable row level security;

-- Users can only read their own notifications
create policy "notif_select_own"
  on public.app_notifications for select
  using (auth.uid() = user_id);

-- Users can mark their own notifications as read
create policy "notif_update_own"
  on public.app_notifications for update
  using (auth.uid() = user_id);

-- Any authenticated user can insert notifications (needed for joint budget alerts
-- which must create a row for both users from a single client session)
create policy "notif_insert_auth"
  on public.app_notifications for insert
  with check (auth.role() = 'authenticated');

-- Users can delete their own notifications (optional clear-all support)
create policy "notif_delete_own"
  on public.app_notifications for delete
  using (auth.uid() = user_id);

-- Index: fast unread count lookup per user
create index if not exists notif_user_unread_idx
  on public.app_notifications (user_id, read)
  where read = false;
