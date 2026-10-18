-- Keep the provider's original text when a user edits a transcript, so "Back to the original text"
-- always works. Additive only: nothing is dropped or rewritten.
--
-- original_words / original_segments are filled by the server on the first save (never by the client:
-- users still have SELECT only on this table). is_edited tells the UI whether an original exists,
-- without sending the copy to the browser.

alter table public.transcripts
  add column original_words jsonb,
  add column original_segments jsonb,
  add column is_edited boolean not null default false;

-- Either both copies exist (edited) or none does (never edited).
alter table public.transcripts
  add constraint transcripts_original_consistent check (
    (is_edited and original_words is not null and original_segments is not null)
    or (not is_edited and original_words is null and original_segments is null)
  );
