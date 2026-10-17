-- F1: user profiles and the append-only credit ledger.
-- The balance is always sum(delta); no mutable balance column exists anywhere.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Supabase makes every new public function callable by API roles. Close that by default so a
-- forgotten revoke on a future money-related function cannot expose it.
-- The PUBLIC default can only be revoked globally; anon/authenticated are granted per schema.
alter default privileges for role postgres
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  locale text not null default 'en' check (locale in ('en', 'fr')),
  country text check (country ~ '^[A-Z]{2}$'),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Supabase grants everything to API roles by default: narrow it to what the UI needs.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, locale, country, theme) on table public.profiles to authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Credit ledger
-- ---------------------------------------------------------------------------

create type public.credit_reason as enum ('signup_bonus', 'purchase', 'job', 'refund');

create table public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,
  reason public.credit_reason not null,
  -- Foreign keys to jobs/payments are added when those tables exist (phases 2 and 5).
  job_id uuid,
  payment_id uuid,
  created_at timestamptz not null default now(),
  constraint credit_ledger_sign_matches_reason check (
    (reason = 'job' and delta < 0)
    or (reason in ('signup_bonus', 'purchase', 'refund') and delta > 0)
  ),
  constraint credit_ledger_job_link check ((reason in ('job', 'refund')) = (job_id is not null)),
  constraint credit_ledger_payment_link check ((reason = 'purchase') = (payment_id is not null))
);

create index credit_ledger_user_created_idx on public.credit_ledger (user_id, created_at desc);

-- Database-level guarantees against double crediting/debiting.
create unique index credit_ledger_one_signup_bonus on public.credit_ledger (user_id)
  where reason = 'signup_bonus';
create unique index credit_ledger_one_debit_per_job on public.credit_ledger (job_id)
  where reason = 'job';
create unique index credit_ledger_one_refund_per_job on public.credit_ledger (job_id)
  where reason = 'refund';
create unique index credit_ledger_one_credit_per_payment on public.credit_ledger (payment_id)
  where reason = 'purchase';

alter table public.credit_ledger enable row level security;

create policy "credit_ledger_select_own" on public.credit_ledger
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Read-only for users: every write goes through the security-definer functions below.
revoke all on table public.credit_ledger from anon, authenticated;
grant select on table public.credit_ledger to authenticated;
revoke all on sequence public.credit_ledger_id_seq from anon, authenticated;
-- Append-only, even for the server. Account deletion still cascades (runs as table owner).
revoke update, delete, truncate on table public.credit_ledger from service_role;

create function public.get_my_credit_balance()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(delta), 0)::integer
  from public.credit_ledger
  where user_id = (select auth.uid());
$$;

revoke all on function public.get_my_credit_balance() from public, anon;
grant execute on function public.get_my_credit_balance() to authenticated;

-- ---------------------------------------------------------------------------
-- Signup: profile creation and the one-time bonus (granted once the email is verified)
-- ---------------------------------------------------------------------------

create function private.grant_signup_bonus(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.credit_ledger (user_id, delta, reason)
  values (p_user_id, 10, 'signup_bonus')
  on conflict (user_id) where reason = 'signup_bonus' do nothing;
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, locale)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'locale' = 'fr' then 'fr' else 'en' end
  )
  on conflict (id) do nothing;

  if new.email_confirmed_at is not null then
    perform private.grant_signup_bonus(new.id);
  end if;

  return new;
end;
$$;

create function private.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform private.grant_signup_bonus(new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function private.handle_user_email_confirmed();

-- ---------------------------------------------------------------------------
-- Server-only credit operations (service_role)
-- ---------------------------------------------------------------------------

-- Debits p_amount for a job; raises insufficient_credits or job_already_reserved.
-- Returns the new balance. Call it in a READ COMMITTED transaction (the default): under
-- REPEATABLE READ the snapshot would predate the lock and the balance check could be stale.
create function public.reserve_credits(p_user_id uuid, p_job_id uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
begin
  if p_user_id is null or p_job_id is null or p_amount is null or p_amount <= 0 then
    raise exception 'invalid_arguments' using errcode = '22023';
  end if;

  -- Serialises concurrent operations on the same user's balance.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  if exists (
    select 1 from public.credit_ledger where job_id = p_job_id and reason = 'job'
  ) then
    raise exception 'job_already_reserved' using errcode = '23505';
  end if;

  select coalesce(sum(delta), 0)::integer into v_balance
  from public.credit_ledger
  where user_id = p_user_id;

  if v_balance < p_amount then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  begin
    insert into public.credit_ledger (user_id, delta, reason, job_id)
    values (p_user_id, -p_amount, 'job', p_job_id);
  exception
    -- Same job id already debited for another user (the lock is per user).
    when unique_violation then
      raise exception 'job_already_reserved' using errcode = '23505';
  end;

  return v_balance - p_amount;
end;
$$;

-- Gives back the credits reserved for a failed job. Safe to call twice:
-- returns the refunded amount, or 0 if the job was already refunded.
create function public.refund_credits(p_job_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_amount integer;
begin
  if p_job_id is null then
    raise exception 'invalid_arguments' using errcode = '22023';
  end if;

  select user_id, -delta into v_user_id, v_amount
  from public.credit_ledger
  where job_id = p_job_id and reason = 'job';

  if not found then
    raise exception 'job_not_reserved' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  insert into public.credit_ledger (user_id, delta, reason, job_id)
  values (v_user_id, v_amount, 'refund', p_job_id)
  on conflict (job_id) where reason = 'refund' do nothing;

  if not found then
    return 0;
  end if;

  return v_amount;
end;
$$;

revoke all on function public.reserve_credits(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.refund_credits(uuid) from public, anon, authenticated;
grant execute on function public.reserve_credits(uuid, uuid, integer) to service_role;
grant execute on function public.refund_credits(uuid) to service_role;

revoke all on all functions in schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Backfill accounts created before this migration
-- ---------------------------------------------------------------------------

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

insert into public.credit_ledger (user_id, delta, reason)
select id, 10, 'signup_bonus' from auth.users where email_confirmed_at is not null
on conflict (user_id) where reason = 'signup_bonus' do nothing;
