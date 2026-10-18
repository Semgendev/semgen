-- Background jobs (transcription, translation, render…) run by Trigger.dev workers.
-- Users can read their jobs; only the server (service_role) changes them.

create type public.job_type as enum ('transcribe', 'translate', 'autocut', 'dub', 'render');
create type public.job_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.job_type not null,
  status public.job_status not null default 'queued',
  progress smallint not null default 0 check (progress between 0 and 100),
  credits_reserved integer not null default 0 check (credits_reserved >= 0),
  options jsonb not null default '{}'::jsonb,
  error_code text check (char_length(error_code) <= 64),
  trigger_run_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index jobs_project_created_idx on public.jobs (project_id, created_at desc);
create index jobs_user_created_idx on public.jobs (user_id, created_at desc);

-- One active job of each type per project: double clicks cannot start (and bill) twice.
create unique index jobs_one_active_per_project_type on public.jobs (project_id, type)
  where status in ('queued', 'running');

alter table public.jobs enable row level security;

create policy "jobs_select_own" on public.jobs
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.jobs from anon, authenticated;
grant select on table public.jobs to authenticated;

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function private.set_updated_at();

-- Live progress in the browser (RLS still applies to Realtime).
alter publication supabase_realtime add table public.jobs;

-- ---------------------------------------------------------------------------
-- Transcripts: word-level timing kept raw (disfluencies included) for later features.
-- ---------------------------------------------------------------------------

create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  language text not null check (language ~ '^[a-z]{2,3}(_[a-z]{2})?$'),
  language_confidence real check (language_confidence between 0 and 1),
  is_original boolean not null default true,
  provider text not null check (provider in ('assemblyai', 'elevenlabs')),
  text text not null,
  -- [{ text, start, end, confidence, speaker }] with times in milliseconds
  words jsonb not null,
  -- [{ start, end, text, speaker, word_start, word_end }]
  segments jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index transcripts_one_original_per_project on public.transcripts (project_id)
  where is_original;

alter table public.transcripts enable row level security;

create policy "transcripts_select_own" on public.transcripts
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.transcripts from anon, authenticated;
grant select on table public.transcripts to authenticated;

create trigger transcripts_set_updated_at
  before update on public.transcripts
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- User entry point: queue a transcription for one of the caller's uploaded projects.
-- p_language is an ISO code chosen by the user, or null for automatic detection.
-- ---------------------------------------------------------------------------

create function public.request_transcription(p_project_id uuid, p_language text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_status public.project_status;
  v_job_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_language is not null and p_language !~ '^[a-z]{2,3}(_[a-z]{2})?$' then
    raise exception 'invalid_language' using errcode = '22023';
  end if;

  select status into v_status
  from public.projects
  where id = p_project_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'project_not_found' using errcode = 'P0002';
  end if;

  if v_status not in ('uploaded', 'ready', 'failed') then
    raise exception 'project_not_ready' using errcode = 'P0001';
  end if;

  begin
    insert into public.jobs (project_id, user_id, type, options)
    values (p_project_id, v_user_id, 'transcribe', jsonb_build_object('language', p_language))
    returning id into v_job_id;
  exception
    when unique_violation then
      raise exception 'job_already_running' using errcode = '23505';
  end;

  update public.projects set status = 'processing' where id = p_project_id;

  return v_job_id;
end;
$$;

revoke all on function public.request_transcription(uuid, text) from public, anon;
grant execute on function public.request_transcription(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- reserve_credits now requires a real job owned by the user (audit recommendation).
-- ---------------------------------------------------------------------------

create or replace function public.reserve_credits(p_user_id uuid, p_job_id uuid, p_amount integer)
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

  if not exists (
    select 1 from public.jobs where id = p_job_id and user_id = p_user_id
  ) then
    raise exception 'job_not_found' using errcode = 'P0002';
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
    when unique_violation then
      raise exception 'job_already_reserved' using errcode = '23505';
  end;

  update public.jobs set credits_reserved = p_amount where id = p_job_id;

  return v_balance - p_amount;
end;
$$;

revoke all on function public.reserve_credits(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_credits(uuid, uuid, integer) to service_role;
