-- ── Migration 005: Pay cycle features ───────────────────────────
-- period_snapshots, temporary fixed costs, notebook tables,
-- fixed cost start dates, savings transactions, transfers

-- ────────────────────────────────────────────────────────────────
-- 1. Period snapshots (one per user per pay-cycle period)
-- ────────────────────────────────────────────────────────────────
create table if not exists public.period_snapshots (
  id                   uuid primary key default gen_random_uuid(),
  period               text not null,                          -- 'YYYY-MM' of ending month
  user_id              uuid not null references public.profiles(id),
  salary               numeric(10,2) not null default 0,
  personal_fixed_total numeric(10,2) not null default 0,
  contribution         numeric(10,2) not null default 0,
  matthew_ratio        numeric(5,4)  not null default 0.5,
  disposable_income    numeric(10,2) not null default 0,
  created_at           timestamptz default now(),
  unique (period, user_id)
);
alter table public.period_snapshots enable row level security;
create policy "authenticated users can read snapshots"
  on public.period_snapshots for select
  using (auth.role() = 'authenticated');
create policy "users can insert own snapshot"
  on public.period_snapshots for insert
  with check (auth.uid() = user_id);
create policy "users can update own snapshot"
  on public.period_snapshots for update
  using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- 2. Temporary fixed costs: active_until + active_from
--    active_until = 'YYYY-MM' of last active period (null = permanent)
--    active_from  = 'YYYY-MM' of first active period (null = from start)
-- ────────────────────────────────────────────────────────────────
alter table public.joint_fixed_outgoings
  add column if not exists active_until text default null;
alter table public.joint_fixed_outgoings
  add column if not exists active_from  text default null;

alter table public.personal_fixed_costs
  add column if not exists active_until text default null;
alter table public.personal_fixed_costs
  add column if not exists active_from  text default null;

-- ────────────────────────────────────────────────────────────────
-- 3. Savings deposits — extend with type, date, note
--    type: 'deposit' (default, adds to balance) | 'withdrawal' (subtracts)
--    transaction_date: actual date of the transaction
--    note: optional free-text description
-- ────────────────────────────────────────────────────────────────
alter table public.joint_savings_deposits
  add column if not exists type             text        not null default 'deposit';
alter table public.joint_savings_deposits
  add column if not exists transaction_date date        default current_date;
alter table public.joint_savings_deposits
  add column if not exists note             text        default '';

alter table public.personal_savings_deposits
  add column if not exists type             text        not null default 'deposit';
alter table public.personal_savings_deposits
  add column if not exists transaction_date date        default current_date;
alter table public.personal_savings_deposits
  add column if not exists note             text        default '';

-- ────────────────────────────────────────────────────────────────
-- 4. One-off transfers between users
--    Either user can send a one-off amount to the other.
--    Reduces sender's disposable, increases recipient's for that period.
-- ────────────────────────────────────────────────────────────────
create table if not exists public.personal_transfers (
  id             uuid primary key default gen_random_uuid(),
  sender_id      uuid not null references public.profiles(id),
  recipient_id   uuid not null references public.profiles(id),
  amount         numeric(10,2) not null check (amount > 0),
  period         text not null,          -- 'YYYY-MM' pay cycle period
  transfer_date  date not null default current_date,
  note           text default '',
  created_at     timestamptz default now()
);
alter table public.personal_transfers enable row level security;
-- Both users can see all transfers (they're both parties)
create policy "authenticated users can read transfers"
  on public.personal_transfers for select
  using (auth.role() = 'authenticated');
create policy "users can insert transfers they send"
  on public.personal_transfers for insert
  with check (auth.uid() = sender_id);
create policy "users can delete own transfers"
  on public.personal_transfers for delete
  using (auth.uid() = sender_id);

-- ────────────────────────────────────────────────────────────────
-- 5. Joint notebook
-- ────────────────────────────────────────────────────────────────
create table if not exists public.joint_notebook_entries (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default '',
  content    text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.joint_notebook_entries enable row level security;
create policy "authenticated users can manage joint notebook"
  on public.joint_notebook_entries for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ────────────────────────────────────────────────────────────────
-- 6. Personal notebook
-- ────────────────────────────────────────────────────────────────
create table if not exists public.personal_notebook_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id),
  title      text not null default '',
  content    text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.personal_notebook_entries enable row level security;
create policy "users can manage own notebook"
  on public.personal_notebook_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
