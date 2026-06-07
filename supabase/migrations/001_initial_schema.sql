-- ============================================================
-- Finance App – Initial Schema
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  salary      numeric(12,2) not null default 0,
  pay_date    int not null default 1 check (pay_date between 1 and 31),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── app_settings ────────────────────────────────────────────
create table public.app_settings (
  id                    int primary key default 1 check (id = 1),
  matthew_split_ratio   numeric(5,4) not null default 0.5
                          check (matthew_split_ratio between 0 and 1),
  updated_at            timestamptz not null default now()
);
insert into public.app_settings (id) values (1);

-- ── joint_fixed_outgoings ───────────────────────────────────
create table public.joint_fixed_outgoings (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  amount                numeric(12,2) not null,
  day_of_month          int not null check (day_of_month between 1 and 31),
  is_savings_contribution boolean not null default false,
  savings_pot_id        uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ── joint_variable_categories ───────────────────────────────
create table public.joint_variable_categories (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  monthly_budget          numeric(12,2) not null,
  notification_sent_month date,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ── joint_transactions ──────────────────────────────────────
create table public.joint_transactions (
  id               uuid primary key default gen_random_uuid(),
  category_id      uuid not null references public.joint_variable_categories(id) on delete cascade,
  description      text not null,
  amount           numeric(12,2) not null,
  transaction_date date not null,
  created_by       uuid not null references public.profiles(id),
  created_at       timestamptz not null default now()
);

-- ── joint_savings_pots ──────────────────────────────────────
create table public.joint_savings_pots (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  target_amount      numeric(12,2) not null,
  target_date        date not null,
  fixed_outgoing_id  uuid references public.joint_fixed_outgoings(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- add FK from joint_fixed_outgoings back to pots (circular, deferred)
alter table public.joint_fixed_outgoings
  add constraint fk_savings_pot
  foreign key (savings_pot_id) references public.joint_savings_pots(id)
  on delete set null;

-- ── joint_savings_deposits ──────────────────────────────────
create table public.joint_savings_deposits (
  id         uuid primary key default gen_random_uuid(),
  pot_id     uuid not null references public.joint_savings_pots(id) on delete cascade,
  amount     numeric(12,2) not null,
  month      date not null,
  created_at timestamptz not null default now()
);

-- ── personal_fixed_costs ────────────────────────────────────
create table public.personal_fixed_costs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  amount       numeric(12,2) not null,
  day_of_month int not null check (day_of_month between 1 and 31),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── personal_variable_categories ────────────────────────────
create table public.personal_variable_categories (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  name                    text not null,
  monthly_budget          numeric(12,2) not null,
  notification_sent_month date,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ── personal_transactions ───────────────────────────────────
create table public.personal_transactions (
  id               uuid primary key default gen_random_uuid(),
  category_id      uuid not null references public.personal_variable_categories(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  description      text not null,
  amount           numeric(12,2) not null,
  transaction_date date not null,
  created_at       timestamptz not null default now()
);

-- ── personal_savings_pots ───────────────────────────────────
create table public.personal_savings_pots (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  target_amount numeric(12,2) not null,
  target_date   date not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── personal_savings_deposits ───────────────────────────────
create table public.personal_savings_deposits (
  id         uuid primary key default gen_random_uuid(),
  pot_id     uuid not null references public.personal_savings_pots(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  amount     numeric(12,2) not null,
  month      date not null,
  created_at timestamptz not null default now()
);

-- ── notification_log ────────────────────────────────────────
create table public.notification_log (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('joint', 'personal')),
  category_id uuid not null,
  user_id     uuid references public.profiles(id),
  month       date not null,
  sent_at     timestamptz not null default now()
);

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

create trigger trg_joint_fixed_updated_at
  before update on public.joint_fixed_outgoings
  for each row execute function public.set_updated_at();

create trigger trg_joint_var_cat_updated_at
  before update on public.joint_variable_categories
  for each row execute function public.set_updated_at();

create trigger trg_joint_savings_pots_updated_at
  before update on public.joint_savings_pots
  for each row execute function public.set_updated_at();

create trigger trg_personal_fixed_updated_at
  before update on public.personal_fixed_costs
  for each row execute function public.set_updated_at();

create trigger trg_personal_var_cat_updated_at
  before update on public.personal_variable_categories
  for each row execute function public.set_updated_at();

create trigger trg_personal_savings_pots_updated_at
  before update on public.personal_savings_pots
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row-Level Security
-- ============================================================
alter table public.profiles                   enable row level security;
alter table public.app_settings               enable row level security;
alter table public.joint_fixed_outgoings      enable row level security;
alter table public.joint_variable_categories  enable row level security;
alter table public.joint_transactions         enable row level security;
alter table public.joint_savings_pots         enable row level security;
alter table public.joint_savings_deposits     enable row level security;
alter table public.personal_fixed_costs       enable row level security;
alter table public.personal_variable_categories enable row level security;
alter table public.personal_transactions      enable row level security;
alter table public.personal_savings_pots      enable row level security;
alter table public.personal_savings_deposits  enable row level security;
alter table public.notification_log           enable row level security;

-- profiles: own row only
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id);

-- app_settings: any authenticated user
create policy "app_settings_auth" on public.app_settings
  for all using (auth.role() = 'authenticated');

-- joint tables: any authenticated user
create policy "joint_fixed_auth" on public.joint_fixed_outgoings
  for all using (auth.role() = 'authenticated');

create policy "joint_var_cat_auth" on public.joint_variable_categories
  for all using (auth.role() = 'authenticated');

create policy "joint_tx_auth" on public.joint_transactions
  for all using (auth.role() = 'authenticated');

create policy "joint_pots_auth" on public.joint_savings_pots
  for all using (auth.role() = 'authenticated');

create policy "joint_deposits_auth" on public.joint_savings_deposits
  for all using (auth.role() = 'authenticated');

-- personal tables: own rows only
create policy "personal_fixed_own" on public.personal_fixed_costs
  for all using (auth.uid() = user_id);

create policy "personal_var_cat_own" on public.personal_variable_categories
  for all using (auth.uid() = user_id);

create policy "personal_tx_own" on public.personal_transactions
  for all using (auth.uid() = user_id);

create policy "personal_pots_own" on public.personal_savings_pots
  for all using (auth.uid() = user_id);

create policy "personal_deposits_own" on public.personal_savings_deposits
  for all using (auth.uid() = user_id);

-- notification_log: joint rows visible to all auth; personal rows own only
create policy "notif_log_joint" on public.notification_log
  for select using (
    auth.role() = 'authenticated' and type = 'joint'
  );

create policy "notif_log_personal" on public.notification_log
  for select using (
    type = 'personal' and auth.uid() = user_id
  );

create policy "notif_log_insert" on public.notification_log
  for insert with check (auth.role() = 'authenticated');
