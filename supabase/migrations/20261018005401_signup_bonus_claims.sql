-- One signup bonus per mailbox, even across account deletion and +alias / Gmail dot tricks.
-- Only a SHA-256 fingerprint of the normalised address is kept, never the address itself.

create table private.signup_bonus_claims (
  email_fingerprint text primary key,
  claimed_at timestamptz not null default now()
);

revoke all on table private.signup_bonus_claims from public, anon, authenticated;

create function private.email_fingerprint(p_email text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_local text := split_part(v_email, '@', 1);
  v_domain text := split_part(v_email, '@', 2);
begin
  v_local := split_part(v_local, '+', 1);

  if v_domain in ('gmail.com', 'googlemail.com') then
    v_local := replace(v_local, '.', '');
    v_domain := 'gmail.com';
  end if;

  return encode(sha256(convert_to(v_local || '@' || v_domain, 'UTF8')), 'hex');
end;
$$;

create or replace function private.grant_signup_bonus(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = p_user_id;
  if v_email is null or v_email = '' then
    return;
  end if;

  insert into private.signup_bonus_claims (email_fingerprint)
  values (private.email_fingerprint(v_email))
  on conflict (email_fingerprint) do nothing;

  if not found then
    return;
  end if;

  insert into public.credit_ledger (user_id, delta, reason)
  values (p_user_id, 10, 'signup_bonus')
  on conflict (user_id) where reason = 'signup_bonus' do nothing;
end;
$$;

revoke all on all functions in schema private from public, anon, authenticated;

-- Register mailboxes that already received their bonus.
insert into private.signup_bonus_claims (email_fingerprint)
select private.email_fingerprint(u.email)
from public.credit_ledger l
join auth.users u on u.id = l.user_id
where l.reason = 'signup_bonus' and u.email is not null and u.email <> ''
on conflict (email_fingerprint) do nothing;
