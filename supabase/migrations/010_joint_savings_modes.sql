-- ── Migration 010: Joint savings pot modes + deposits schema ──────────────────
--
-- 1. joint_savings_pots — add open mode support
--      mode: 'targeted' (existing default) | 'open'
--      target_amount and target_date become nullable (open pots have neither)
--
-- 2. joint_savings_deposits — add transaction_date, type, note, and per-person
--      split columns (matthew_share, maddy_share) required for open-mode
--      disposable deductions.
--
--      The existing 'month' column is migrated to 'transaction_date' then made
--      nullable for backward compatibility.
-- ────────────────────────────────────────────────────────────────────────────


-- ── 1. joint_savings_pots ────────────────────────────────────────────────────

alter table public.joint_savings_pots
  add column if not exists mode text not null default 'targeted'
    check (mode in ('targeted', 'open'));

alter table public.joint_savings_pots
  alter column target_amount drop not null;

alter table public.joint_savings_pots
  alter column target_date drop not null;


-- ── 2. joint_savings_deposits ────────────────────────────────────────────────

-- Add transaction_date (will replace 'month' as the canonical date column)
alter table public.joint_savings_deposits
  add column if not exists transaction_date date;

-- Seed transaction_date from existing 'month' data so we can make it NOT NULL
update public.joint_savings_deposits
  set transaction_date = month
  where transaction_date is null;

alter table public.joint_savings_deposits
  alter column transaction_date set not null;

-- Make legacy 'month' column nullable (kept for backward compat, no longer required)
alter table public.joint_savings_deposits
  alter column month drop not null;

-- Add transaction type
alter table public.joint_savings_deposits
  add column if not exists type text not null default 'deposit'
    check (type in ('deposit', 'withdrawal'));

-- Add note
alter table public.joint_savings_deposits
  add column if not exists note text not null default '';

-- Per-person split (open-mode only):
--   deposit  → deduct matthew_share from Matthew's disposable, maddy_share from Maddy's
--   withdrawal → credit matthew_share back to Matthew, maddy_share back to Maddy
--   null for targeted-mode rows (fixed outgoing handles the deduction)
alter table public.joint_savings_deposits
  add column if not exists matthew_share numeric(12,2) default null;

alter table public.joint_savings_deposits
  add column if not exists maddy_share numeric(12,2) default null;
