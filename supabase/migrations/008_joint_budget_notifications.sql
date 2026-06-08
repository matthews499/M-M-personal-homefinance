-- ── Migration 008: Joint budget threshold notification types ──
--
-- Adds joint_budget_50 / _80 / _100 to the app_notifications.type
-- check constraint so the checkJointBudgetAlerts utility can store
-- bell alerts for both users when 50%, 80%, or 100% of the combined
-- joint variable budget has been spent.
--
-- Pattern: one row per user per threshold per period.
-- dedup_key: 'joint_budget_50:{period}:{userId}' etc.

alter table public.app_notifications
  drop constraint app_notifications_type_check;

alter table public.app_notifications
  add constraint app_notifications_type_check
  check (type in (
    'disposable_50',
    'disposable_80',
    'disposable_100',
    'variable_budget_80',
    'task_due_soon',
    'joint_budget_50',
    'joint_budget_80',
    'joint_budget_100'
  ));
