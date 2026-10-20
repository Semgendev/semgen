-- User preferences that follow the account across browsers. Today: the custom colours of the caption
-- editor ("Mes couleurs"). Additive only (new table), nothing is dropped or changed.
-- Read by the user (row-level security); written by the server only, after Zod validation.

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- "#RRGGBB", newest first, at most 24
  custom_colors text[] not null default '{}'
    constraint user_preferences_custom_colors_max check (cardinality(custom_colors) <= 24),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "user_preferences_select_own" on public.user_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.user_preferences from anon, authenticated;
grant select on table public.user_preferences to authenticated;
