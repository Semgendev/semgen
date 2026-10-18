-- F4: the caption style chosen for a project (preset id + the user's adjustments), as a JSON object.
-- Additive only. Written by the server after Zod validation (users keep UPDATE on "title" only).

alter table public.projects
  add column caption_style jsonb;

alter table public.projects
  add constraint projects_caption_style_shape check (
    caption_style is null
    or (jsonb_typeof(caption_style) = 'object' and pg_column_size(caption_style) <= 16384)
  );
