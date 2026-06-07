-- ── joint_misc_expenses ─────────────────────────────────────
create table public.joint_misc_expenses (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  amount       numeric(12,2) not null,
  expense_date date not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_joint_misc_updated_at
  before update on public.joint_misc_expenses
  for each row execute function public.set_updated_at();

alter table public.joint_misc_expenses enable row level security;
create policy "joint_misc_auth" on public.joint_misc_expenses
  for all using (auth.role() = 'authenticated');

-- ── personal_misc_expenses ───────────────────────────────────
create table public.personal_misc_expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  amount       numeric(12,2) not null,
  expense_date date not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_personal_misc_updated_at
  before update on public.personal_misc_expenses
  for each row execute function public.set_updated_at();

alter table public.personal_misc_expenses enable row level security;
create policy "personal_misc_auth" on public.personal_misc_expenses
  for all using (auth.uid() = user_id);
