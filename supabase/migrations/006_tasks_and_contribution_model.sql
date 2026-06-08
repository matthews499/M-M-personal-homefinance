-- ── Migration 006: Correct contribution model + personal summaries RPC + tasks ──

-- ────────────────────────────────────────────────────────────────
-- 1. Replace get_joint_contributions with corrected calculation model
--
--    Old (wrong):  contribution = salary − personal_fixed_total
--                  disposable   = (totalIn − joint costs) × ratio
--
--    New (correct):
--      available    = salary − personal_fixed_total   (per person)
--      total_avail  = Σ available
--      joint_costs  = Σ joint_fixed (active) + Σ var_budgets
--      total_disp   = total_avail − joint_costs
--      disposable   = total_disp × ratio              (per person)
--      contribution = available  − disposable          (per person, derived)
--
--    Both active_from / active_until columns (added in 005) are respected.
-- ────────────────────────────────────────────────────────────────

drop function if exists public.get_joint_contributions();

create function public.get_joint_contributions()
returns table (
  user_id              uuid,
  name                 text,
  salary               numeric,
  pay_date             int,
  personal_fixed_total numeric,
  available            numeric,
  contribution         numeric,
  disposable           numeric
)
language plpgsql
security definer
stable
as $$
declare
  v_period        text;
  v_matthew_uuid  uuid    := 'c722d728-5abe-41fe-9965-3f5d5c69a891';
  v_matthew_ratio numeric;
  v_total_avail   numeric;
  v_joint_costs   numeric;
  v_total_disp    numeric;
begin
  -- Current pay-cycle period: on/after the 26th we're already in next month's period
  v_period := case
    when extract(day from now()) >= 26
    then to_char(now() + interval '1 month', 'YYYY-MM')
    else to_char(now(), 'YYYY-MM')
  end;

  -- Matthew's split ratio from settings
  select matthew_split_ratio into v_matthew_ratio
  from public.app_settings
  limit 1;

  -- ── Sum total available across both users ───────────────────
  select coalesce(sum(u.avail), 0) into v_total_avail
  from (
    select
      p.salary
      - coalesce(sum(pfc.amount) filter (
          where (pfc.active_until is null or pfc.active_until >= v_period)
            and (pfc.active_from  is null or pfc.active_from  <= v_period)
        ), 0) as avail
    from public.profiles p
    left join public.personal_fixed_costs pfc on pfc.user_id = p.id
    group by p.id, p.salary
  ) u;

  -- ── Total joint costs (planned, not actuals) ────────────────
  --    joint fixed outgoings (active for this period) + variable budgets
  select
    coalesce((
      select sum(amount)
      from   public.joint_fixed_outgoings
      where  (active_until is null or active_until >= v_period)
        and  (active_from  is null or active_from  <= v_period)
    ), 0)
    +
    coalesce((
      select sum(monthly_budget)
      from   public.joint_variable_categories
    ), 0)
  into v_joint_costs;

  -- ── Total disposable = what remains after all joint costs ───
  v_total_disp := v_total_avail - v_joint_costs;

  -- ── Per-person breakdown ────────────────────────────────────
  return query
  with per_person as (
    select
      p.id,
      p.name,
      p.salary,
      p.pay_date,
      coalesce(sum(pfc.amount) filter (
        where (pfc.active_until is null or pfc.active_until >= v_period)
          and (pfc.active_from  is null or pfc.active_from  <= v_period)
      ), 0) as pf_total
    from public.profiles p
    left join public.personal_fixed_costs pfc on pfc.user_id = p.id
    group by p.id, p.name, p.salary, p.pay_date
  )
  select
    pp.id                                                             as user_id,
    pp.name,
    pp.salary,
    pp.pay_date,
    pp.pf_total                                                       as personal_fixed_total,
    pp.salary - pp.pf_total                                           as available,
    -- contribution = available minus their share of total disposable
    (pp.salary - pp.pf_total)
      - (v_total_disp * (case pp.id
           when v_matthew_uuid then v_matthew_ratio
           else (1 - v_matthew_ratio)
         end))                                                        as contribution,
    -- disposable = their ratio-share of total disposable
    v_total_disp * (case pp.id
      when v_matthew_uuid then v_matthew_ratio
      else (1 - v_matthew_ratio)
    end)                                                              as disposable
  from per_person pp
  order by pp.name;
end;
$$;

grant execute on function public.get_joint_contributions() to authenticated;


-- ────────────────────────────────────────────────────────────────
-- 2. New RPC: get_personal_summaries(p_period)
--
--    Returns personal variable budget, actual spending, and misc
--    totals for BOTH users for the given pay-cycle period.
--    Security definer so the dashboard can read both users'
--    summary numbers without violating row-level personal privacy.
-- ────────────────────────────────────────────────────────────────

create or replace function public.get_personal_summaries(p_period text)
returns table (
  user_id    uuid,
  var_budget numeric,
  var_spent  numeric,
  misc_total numeric
)
language plpgsql
security definer
stable
as $$
declare
  v_year  int;
  v_month int;
  v_start date;
  v_end   date;
begin
  v_year  := split_part(p_period, '-', 1)::int;
  v_month := split_part(p_period, '-', 2)::int;

  -- Pay cycle: 26th of previous month → 25th of named month
  v_start := make_date(
    case when v_month = 1 then v_year - 1 else v_year end,
    case when v_month = 1 then 12         else v_month - 1 end,
    26
  );
  v_end := make_date(v_year, v_month, 25);

  return query
  select
    p.id                                                        as user_id,
    -- total personal variable budget (all categories, no period filter)
    coalesce((
      select sum(vc.monthly_budget)
      from   public.personal_variable_categories vc
      where  vc.user_id = p.id
    ), 0)                                                       as var_budget,
    -- actual personal variable spending in this period
    coalesce((
      select sum(pt.amount)
      from   public.personal_transactions pt
      where  pt.user_id = p.id
        and  pt.transaction_date >= v_start
        and  pt.transaction_date <= v_end
    ), 0)                                                       as var_spent,
    -- personal misc expenses in this period
    coalesce((
      select sum(pm.amount)
      from   public.personal_misc_expenses pm
      where  pm.user_id = p.id
        and  pm.expense_date >= v_start
        and  pm.expense_date <= v_end
    ), 0)                                                       as misc_total
  from public.profiles p;
end;
$$;

grant execute on function public.get_personal_summaries(text) to authenticated;


-- ────────────────────────────────────────────────────────────────
-- 3. Tasks table
--
--    type = 'contribution_reminder'
--      Auto-created at the start of each pay period.
--      Title: "Transfer £X into joint this month"
--
--    type = 'expense_topup'
--      Auto-created when a new joint fixed/variable cost is added
--      mid-period. Title: "Transfer £X into joint — new expense: Y"
--      On completion, inserts a personal_misc_expenses row for the
--      user so it deducts from their personal disposable.
--
--    Each user has their own row per task — completion is independent.
--    Incomplete tasks carry over (period <= current is always shown).
-- ────────────────────────────────────────────────────────────────

create table if not exists public.tasks (
  id                   uuid        primary key default gen_random_uuid(),
  type                 text        not null
                         check (type in ('contribution_reminder', 'expense_topup')),
  user_id              uuid        not null references public.profiles(id) on delete cascade,
  title                text        not null default '',
  amount               numeric(10,2) not null default 0,
  period               text        not null,    -- 'YYYY-MM' of the pay period this was raised for
  completed            boolean     not null default false,
  completed_at         timestamptz default null,
  -- Only set for expense_topup — which expense triggered this task
  related_expense_id   uuid        default null,
  related_expense_type text        default null
                         check (related_expense_type in ('joint_fixed', 'joint_variable')
                                or related_expense_type is null),
  created_at           timestamptz default now()
);

-- One contribution_reminder per user per period
create unique index if not exists tasks_contribution_unique
  on public.tasks (user_id, period)
  where type = 'contribution_reminder';

-- One expense_topup per user per expense per period
create unique index if not exists tasks_expense_topup_unique
  on public.tasks (user_id, period, related_expense_id)
  where type = 'expense_topup'
    and related_expense_id is not null;

alter table public.tasks enable row level security;

-- Both users can see all tasks (shared visibility for coordination)
create policy "tasks_read_auth"
  on public.tasks for select
  using (auth.role() = 'authenticated');

-- Any authenticated user can insert tasks for any user_id
-- (required: when Matthew adds an expense, Maddy's task row must also be created)
create policy "tasks_insert_auth"
  on public.tasks for insert
  with check (auth.role() = 'authenticated');

-- Each user can only update (complete) their own tasks
create policy "tasks_update_own"
  on public.tasks for update
  using (auth.uid() = user_id);

-- Each user can only delete their own tasks
create policy "tasks_delete_own"
  on public.tasks for delete
  using (auth.uid() = user_id);
