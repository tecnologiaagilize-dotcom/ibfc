-- Justificativa institucional do apoio do MFB, editável por candidatura.
alter table public.candidates
  add column if not exists endorsement_reason text;
