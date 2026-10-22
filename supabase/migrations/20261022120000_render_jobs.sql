-- Export of a video with its captions (Remotion Lambda), run as a 'render' job by Trigger.dev.
-- Additive only: one nullable column and one function.

-- Where the finished file is (render id, S3 bucket and key, size), written by the server only.
alter table public.jobs add column result jsonb;

-- ---------------------------------------------------------------------------
-- User entry point: queue an export of one of the caller's transcribed projects.
-- p_options = { format, fit, quality }, checked again by the server and the worker.
-- ---------------------------------------------------------------------------

create function public.request_render(p_project_id uuid, p_options jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_job_id uuid;
  v_recent integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_options is null
    or jsonb_typeof(p_options) <> 'object'
    or not (p_options ->> 'format' in ('original', '9:16', '1:1', '16:9'))
    or not (p_options ->> 'fit' in ('crop', 'blur'))
    or not (p_options ->> 'quality' in ('720p', '1080p', '4k')) then
    raise exception 'invalid_options' using errcode = '22023';
  end if;

  perform 1
  from public.projects
  where id = p_project_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'project_not_found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.transcripts where project_id = p_project_id and is_original
  ) then
    raise exception 'no_transcript' using errcode = 'P0001';
  end if;

  -- Exports are free for most qualities: a cap keeps one account from running up the AWS bill.
  select count(*) into v_recent
  from public.jobs
  where user_id = v_user_id and type = 'render' and created_at > now() - interval '1 day';

  if v_recent >= 30 then
    raise exception 'render_limit' using errcode = 'P0001';
  end if;

  begin
    insert into public.jobs (project_id, user_id, type, options)
    values (
      p_project_id,
      v_user_id,
      'render',
      jsonb_build_object(
        'format', p_options ->> 'format',
        'fit', p_options ->> 'fit',
        'quality', p_options ->> 'quality'
      )
    )
    returning id into v_job_id;
  exception
    when unique_violation then
      raise exception 'job_already_running' using errcode = '23505';
  end;

  return v_job_id;
end;
$$;

revoke all on function public.request_render(uuid, jsonb) from public, anon;
grant execute on function public.request_render(uuid, jsonb) to authenticated;
