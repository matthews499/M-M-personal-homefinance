-- ============================================================
-- RPC: get_joint_contributions
-- Returns both users' salary, personal fixed cost total, and
-- calculated joint contribution. Runs as security definer so
-- both users can see each other's contribution total without
-- exposing the individual cost line items (which stay private).
-- ============================================================

create or replace function public.get_joint_contributions()
returns table (
  user_id              uuid,
  name                 text,
  salary               numeric,
  pay_date             int,
  personal_fixed_total numeric,
  contribution         numeric
)
language sql
security definer
stable
as $$
  select
    p.id                                          as user_id,
    p.name,
    p.salary,
    p.pay_date,
    coalesce(sum(pfc.amount), 0)                  as personal_fixed_total,
    p.salary - coalesce(sum(pfc.amount), 0)       as contribution
  from public.profiles p
  left join public.personal_fixed_costs pfc on pfc.user_id = p.id
  group by p.id, p.name, p.salary, p.pay_date
  order by p.name;
$$;

-- Allow any authenticated user to call this function
grant execute on function public.get_joint_contributions() to authenticated;
