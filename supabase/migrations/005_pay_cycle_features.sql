-- ── Migration 005: Pay cycle features ───────────────────────────
-- period_snapshots, temporary fixed costs, notebook tables

-- Period snapshots (one per user per pay-cycle period)
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

-- Temporary fixed costs: active_until = 'YYYY-MM' of last active period
alter table public.joint_fixed_outgoings
  add column if not exists active_until text default null;

alter table public.personal_fixed_costs
  add column if not exists active_until text default null;

-- Joint notebook
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

-- Personal notebook
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
