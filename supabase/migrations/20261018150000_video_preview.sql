-- Browser-safe preview copy of each video (H.264 + AAC in an MP4), so every browser can play it.
-- Additive only. The original file is kept untouched for processing and final rendering.
-- Storage layout: videos/{user_id}/{project_id}/preview.mp4 (or the source itself when it is already safe).

create type public.preview_status as enum ('pending', 'processing', 'ready', 'failed');

alter table public.projects
  add column preview_status public.preview_status not null default 'pending',
  add column preview_video_key text;

-- No grant change on purpose: users keep select (all columns) and may only update the title,
-- so preview_status / preview_video_key are written by the server (secret key) only.
