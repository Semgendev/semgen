-- F2: projects and private video storage.
-- Storage layout: videos/{user_id}/{project_id}/source.{ext}

create type public.project_status as enum ('uploading', 'uploaded', 'processing', 'ready', 'failed');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  status public.project_status not null default 'uploading',
  source_video_key text,
  source_size_bytes bigint check (source_size_bytes > 0),
  duration_s numeric(10, 3) check (duration_s > 0),
  width integer check (width > 0),
  height integer check (height > 0),
  fps numeric(6, 3) check (fps > 0),
  detected_language text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_created_idx on public.projects (user_id, created_at desc);

alter table public.projects enable row level security;

create policy "projects_select_own" on public.projects
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "projects_insert_own" on public.projects
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "projects_update_own" on public.projects
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "projects_delete_own" on public.projects
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Users only ever set the title. Status, video metadata and ownership are server-controlled.
revoke all on table public.projects from anon, authenticated;
grant select, delete on table public.projects to authenticated;
grant insert (title) on table public.projects to authenticated;
grant update (title) on table public.projects to authenticated;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Private bucket with server-enforced size and type limits.
-- 50 MB is the Supabase free-plan ceiling; raise it when storage moves to R2 / a paid plan.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos',
  'videos',
  false,
  52428800,
  array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Users may write only inside videos/{their id}/{one of their own projects}/.
create policy "videos_insert_own_project" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[2]
        and p.user_id = (select auth.uid())
    )
  );

create policy "videos_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "videos_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- Marks a project as uploaded after checking that the file really exists in storage.
-- The size comes from storage metadata, never from the client.
-- ---------------------------------------------------------------------------

create function public.mark_project_uploaded(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text;
  v_size bigint;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.projects where id = p_project_id and user_id = v_user_id
  ) then
    raise exception 'project_not_found' using errcode = 'P0002';
  end if;

  select o.name, (o.metadata ->> 'size')::bigint
  into v_name, v_size
  from storage.objects o
  where o.bucket_id = 'videos'
    and o.name like v_user_id::text || '/' || p_project_id::text || '/source.%'
  order by o.created_at desc
  limit 1;

  if v_name is null or v_size is null or v_size <= 0 then
    raise exception 'upload_not_found' using errcode = 'P0002';
  end if;

  update public.projects
  set status = 'uploaded',
      source_video_key = v_name,
      source_size_bytes = v_size
  where id = p_project_id
    and user_id = v_user_id
    and status = 'uploading';
end;
$$;

revoke all on function public.mark_project_uploaded(uuid) from public, anon;
grant execute on function public.mark_project_uploaded(uuid) to authenticated;
