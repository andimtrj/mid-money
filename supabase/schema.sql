-- ============================================================================
-- Budget Tracker — Supabase schema (Pocket-based)
-- ----------------------------------------------------------------------------
-- Tables, RLS policies, indexes, and triggers.
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- All tables are owned by `auth.uid()` and isolated via Row Level Security.
-- ============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Enums -----------------------------------------------------------------------
do $$ begin
  create type tx_type as enum ('income', 'expense');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- profiles  (1:1 with auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================================
-- wallets  (one per user; main balance only)
-- ============================================================================
create table if not exists public.wallets (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  active       bigint not null default 0,
  updated_at   timestamptz not null default now()
);

-- ============================================================================
-- categories (for income transactions only)
-- ============================================================================
create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  type         tx_type not null,
  created_at   timestamptz not null default now()
);
create index if not exists categories_user_idx on public.categories(user_id);
create unique index if not exists categories_user_name_type_uniq
  on public.categories(user_id, lower(name), type);

-- ============================================================================
-- pockets (balance containers; expense transactions draw from pockets)
-- ============================================================================
create table if not exists public.pockets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  balance      bigint not null default 0,
  is_investment boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists pockets_user_idx on public.pockets(user_id);
create unique index if not exists pockets_user_name_uniq
  on public.pockets(user_id, lower(name));

-- ============================================================================
-- transactions
--   - Income: can have optional category_id and optional pocket_id (where it goes)
--   - Expense: must have pocket_id (which pocket it's taken from), category_id unused
-- ============================================================================
create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          tx_type not null,
  amount        bigint not null check (amount > 0),
  category_id   uuid references public.categories(id) on delete set null,
  pocket_id     uuid references public.pockets(id) on delete restrict,
  note          text not null default '',
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index if not exists transactions_user_occurred_idx
  on public.transactions(user_id, occurred_at desc);
create index if not exists transactions_user_category_idx
  on public.transactions(user_id, category_id);
create index if not exists transactions_user_pocket_idx
  on public.transactions(user_id, pocket_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists wallets_touch on public.wallets;
create trigger wallets_touch before update on public.wallets
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- New-user bootstrap
--   Auto-creates a profile, wallet, and investment pocket when user signs up.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.wallets (user_id) values (new.id)
  on conflict (user_id) do nothing;

  -- Auto-create investment pocket
  insert into public.pockets (user_id, name, is_investment, balance)
  values (new.id, 'Investment', true, 0)
  on conflict do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Wallet and Pocket maintenance: keep balances in sync when transactions change.
-- ============================================================================
create or replace function public.tx_balance_delta()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_delta bigint := 0;
begin
  if (TG_OP = 'INSERT') then
    if new.type = 'income' then
      -- Income always goes to main wallet.active
      update public.wallets set active = active + new.amount where user_id = new.user_id;
    elsif new.type = 'expense' and new.pocket_id is not null then
      -- Expense is deducted from pocket
      update public.pockets set balance = balance - new.amount where id = new.pocket_id;
    end if;
    return new;

  elsif (TG_OP = 'UPDATE') then
    -- If amount or type changed, adjust previous and new state
    if old.type = 'income' then
      update public.wallets set active = active - old.amount where user_id = old.user_id;
    elsif old.type = 'expense' and old.pocket_id is not null then
      update public.pockets set balance = balance + old.amount where id = old.pocket_id;
    end if;

    if new.type = 'income' then
      update public.wallets set active = active + new.amount where user_id = new.user_id;
    elsif new.type = 'expense' and new.pocket_id is not null then
      update public.pockets set balance = balance - new.amount where id = new.pocket_id;
    end if;
    return new;

  elsif (TG_OP = 'DELETE') then
    if old.type = 'income' then
      update public.wallets set active = active - old.amount where user_id = old.user_id;
    elsif old.type = 'expense' and old.pocket_id is not null then
      update public.pockets set balance = balance + old.amount where id = old.pocket_id;
    end if;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists tx_balance_ins on public.transactions;
create trigger tx_balance_ins after insert on public.transactions
  for each row execute function public.tx_balance_delta();

drop trigger if exists tx_balance_upd on public.transactions;
create trigger tx_balance_upd after update on public.transactions
  for each row execute function public.tx_balance_delta();

drop trigger if exists tx_balance_del on public.transactions;
create trigger tx_balance_del after delete on public.transactions
  for each row execute function public.tx_balance_delta();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles   enable row level security;
alter table public.wallets    enable row level security;
alter table public.categories enable row level security;
alter table public.pockets    enable row level security;
alter table public.transactions enable row level security;

-- profiles: a user sees & edits only their own row
drop policy if exists "profiles self read"   on public.profiles;
drop policy if exists "profiles self write"  on public.profiles;
create policy "profiles self read"  on public.profiles for select using (id = auth.uid());
create policy "profiles self write" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- wallets: same pattern
drop policy if exists "wallets self read"   on public.wallets;
drop policy if exists "wallets self write"  on public.wallets;
create policy "wallets self read"  on public.wallets for select using (user_id = auth.uid());
create policy "wallets self write" on public.wallets for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- generic per-user policy for the rest
do $$
declare
  t text;
begin
  for t in select unnest(array['categories','pockets','transactions'])
  loop
    execute format('drop policy if exists "%s read"   on public.%I', t, t);
    execute format('drop policy if exists "%s insert" on public.%I', t, t);
    execute format('drop policy if exists "%s update" on public.%I', t, t);
    execute format('drop policy if exists "%s delete" on public.%I', t, t);

    execute format($f$create policy "%s read"   on public.%I for select using (user_id = auth.uid())$f$, t, t);
    execute format($f$create policy "%s insert" on public.%I for insert with check (user_id = auth.uid())$f$, t, t);
    execute format($f$create policy "%s update" on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())$f$, t, t);
    execute format($f$create policy "%s delete" on public.%I for delete using (user_id = auth.uid())$f$, t, t);
  end loop;
end $$;

-- ============================================================================
-- Done.
-- ============================================================================
