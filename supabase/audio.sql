-- Run once in the Supabase SQL Editor.
alter table public.audio_sessions add column if not exists audio_url text;
