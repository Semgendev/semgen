-- T4.4: the 1080p H.264 working copy the export reads instead of the original upload.
-- Additive only: one nullable column (null = no copy, the export uses the original).

alter table public.projects
  add column working_video_key text;

alter table public.projects
  add constraint projects_working_video_key_len check (
    working_video_key is null or char_length(working_video_key) <= 512
  );
