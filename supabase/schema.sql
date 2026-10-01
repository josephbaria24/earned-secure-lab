-- Earned Secure Lab — paste into Supabase SQL Editor and run once.
-- Auth (email/password) stays in auth.users. Passwords are never stored here.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('trial', 'subscriber', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attachment_style as enum ('anxious', 'avoidant', 'secure');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.mood_label as enum ('Disconnected', 'Unsettled', 'Neutral', 'Connected', 'Secure');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.publish_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_kind as enum ('article', 'audio', 'exercise', 'qa');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.plan_interval as enum ('monthly', 'annual');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Profiles (one row per auth user)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default 'New',
  last_name text not null default 'Member',
  role public.user_role not null default 'trial',
  attachment public.attachment_style not null default 'secure',
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.trial_days_remaining(p public.profiles)
returns integer
language sql
stable
as $$
  select greatest(0, ceil(extract(epoch from (p.trial_ends_at - now())) / 86400.0))::integer;
$$;

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  summary text not null,
  body text not null default '',
  hero_label text,
  author text not null default 'Earned Secure Lab',
  read_minutes integer not null default 5,
  recommended_for public.attachment_style,
  is_premium boolean not null default false,
  status public.publish_status not null default 'published',
  sort_order integer not null default 0,
  published_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audio_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  duration_seconds integer not null,
  audio_url text,
  attachment_focus public.attachment_style,
  is_featured boolean not null default false,
  is_premium boolean not null default false,
  status public.publish_status not null default 'published',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  duration_minutes integer not null default 6,
  attachment_style public.attachment_style,
  is_premium boolean not null default false,
  status public.publish_status not null default 'published',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qa_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  status public.publish_status not null default 'published',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  interval public.plan_interval not null unique,
  name text not null,
  price_cents integer not null,
  currency text not null default 'usd',
  badge text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Assessment
-- ---------------------------------------------------------------------------
create table if not exists public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  sort_order integer not null default 0
);

create table if not exists public.assessment_options (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  letter text not null,
  style public.attachment_style not null,
  sort_order integer not null default 0
);

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  anxious_pct numeric(5,2) not null default 0,
  secure_pct numeric(5,2) not null default 0,
  avoidant_pct numeric(5,2) not null default 0,
  primary_pattern public.attachment_style,
  summary text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts (id) on delete cascade,
  question_id uuid not null references public.assessment_questions (id) on delete cascade,
  option_id uuid not null references public.assessment_options (id),
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

-- ---------------------------------------------------------------------------
-- User activity
-- ---------------------------------------------------------------------------
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  check_in_date date not null default ((now() at time zone 'utc')::date),
  mood public.mood_label not null,
  note text,
  mood_score smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, check_in_date),
  constraint check_ins_score_range check (mood_score between 0 and 100)
);

create table if not exists public.article_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  progress_pct numeric(5,2) not null default 0,
  last_opened_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, article_id),
  constraint article_progress_pct check (progress_pct between 0 and 100)
);

create table if not exists public.article_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookmarks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_kind public.content_kind not null,
  content_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, content_kind, content_id)
);

create table if not exists public.audio_plays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null references public.audio_sessions (id) on delete cascade,
  listened_seconds integer not null default 0,
  played_at timestamptz not null default now()
);

create table if not exists public.exercise_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  completed_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  icon text not null default 'favourite',
  created_at timestamptz not null default now()
);

create table if not exists public.notification_reads (
  user_id uuid not null references public.profiles (id) on delete cascade,
  notification_id uuid not null references public.notifications (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id),
  status text not null default 'active',
  started_at timestamptz not null default now(),
  ends_at timestamptz
);

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  notifications_enabled boolean not null default true,
  appearance text not null default 'system',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists articles_updated_at on public.articles;
create trigger articles_updated_at before update on public.articles
for each row execute function public.set_updated_at();

drop trigger if exists audio_updated_at on public.audio_sessions;
create trigger audio_updated_at before update on public.audio_sessions
for each row execute function public.set_updated_at();

drop trigger if exists exercises_updated_at on public.exercises;
create trigger exercises_updated_at before update on public.exercises
for each row execute function public.set_updated_at();

drop trigger if exists qa_updated_at on public.qa_items;
create trigger qa_updated_at before update on public.qa_items
for each row execute function public.set_updated_at();

drop trigger if exists check_ins_updated_at on public.check_ins;
create trigger check_ins_updated_at before update on public.check_ins
for each row execute function public.set_updated_at();

drop trigger if exists reflections_updated_at on public.article_reflections;
create trigger reflections_updated_at before update on public.article_reflections
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', 'New'),
    coalesce(new.raw_user_meta_data->>'last_name', 'Member')
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.articles enable row level security;
alter table public.audio_sessions enable row level security;
alter table public.exercises enable row level security;
alter table public.qa_items enable row level security;
alter table public.plans enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_options enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_answers enable row level security;
alter table public.check_ins enable row level security;
alter table public.article_progress enable row level security;
alter table public.article_reflections enable row level security;
alter table public.bookmarks enable row level security;
alter table public.audio_plays enable row level security;
alter table public.exercise_completions enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_settings enable row level security;

-- profiles
drop policy if exists "profiles select own or admin" on public.profiles;
create policy "profiles select own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles
  for update using (public.is_admin());

-- published content is readable by signed-in users; admins manage it
drop policy if exists "articles read published" on public.articles;
create policy "articles read published" on public.articles
  for select using (status = 'published' or public.is_admin());

drop policy if exists "articles admin write" on public.articles;
create policy "articles admin write" on public.articles
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "audio read published" on public.audio_sessions;
create policy "audio read published" on public.audio_sessions
  for select using (status = 'published' or public.is_admin());

drop policy if exists "audio admin write" on public.audio_sessions;
create policy "audio admin write" on public.audio_sessions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "exercises read published" on public.exercises;
create policy "exercises read published" on public.exercises
  for select using (status = 'published' or public.is_admin());

drop policy if exists "exercises admin write" on public.exercises;
create policy "exercises admin write" on public.exercises
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "qa read published" on public.qa_items;
create policy "qa read published" on public.qa_items
  for select using (status = 'published' or public.is_admin());

drop policy if exists "qa admin write" on public.qa_items;
create policy "qa admin write" on public.qa_items
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "plans read" on public.plans;
create policy "plans read" on public.plans
  for select using (auth.uid() is not null);

drop policy if exists "assessment questions read" on public.assessment_questions;
create policy "assessment questions read" on public.assessment_questions
  for select using (auth.uid() is not null);

drop policy if exists "assessment options read" on public.assessment_options;
create policy "assessment options read" on public.assessment_options
  for select using (auth.uid() is not null);

drop policy if exists "assessment questions admin" on public.assessment_questions;
create policy "assessment questions admin" on public.assessment_questions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "assessment options admin" on public.assessment_options;
create policy "assessment options admin" on public.assessment_options
  for all using (public.is_admin()) with check (public.is_admin());

-- own activity
drop policy if exists "attempts own" on public.assessment_attempts;
create policy "attempts own" on public.assessment_attempts
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "answers own" on public.assessment_answers;
create policy "answers own" on public.assessment_answers
  for all using (
    exists (
      select 1 from public.assessment_attempts a
      where a.id = attempt_id and (a.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.assessment_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    )
  );

drop policy if exists "check_ins own" on public.check_ins;
create policy "check_ins own" on public.check_ins
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

drop policy if exists "progress own" on public.article_progress;
create policy "progress own" on public.article_progress
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

drop policy if exists "reflections own" on public.article_reflections;
create policy "reflections own" on public.article_reflections
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

drop policy if exists "bookmarks own" on public.bookmarks;
create policy "bookmarks own" on public.bookmarks
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

drop policy if exists "plays own" on public.audio_plays;
create policy "plays own" on public.audio_plays
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

drop policy if exists "completions own" on public.exercise_completions;
create policy "completions own" on public.exercise_completions
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

drop policy if exists "notifications read" on public.notifications;
create policy "notifications read" on public.notifications
  for select using (user_id is null or user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications admin" on public.notifications;
create policy "notifications admin" on public.notifications
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "reads own" on public.notification_reads;
create policy "reads own" on public.notification_reads
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

drop policy if exists "subs own" on public.subscriptions;
create policy "subs own" on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "subs insert own" on public.subscriptions;
create policy "subs insert own" on public.subscriptions
  for insert with check (user_id = auth.uid());

drop policy if exists "settings own" on public.user_settings;
create policy "settings own" on public.user_settings
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Seed content from the current app screens
-- ---------------------------------------------------------------------------
insert into public.plans (interval, name, price_cents, badge)
values
  ('monthly', 'Monthly', 1499, 'MONTHLY'),
  ('annual', 'Annual', 11999, 'ANNUAL · SAVE 33%')
on conflict (interval) do nothing;

insert into public.articles (category, title, summary, body, hero_label, read_minutes, recommended_for, sort_order, published_at)
select * from (values
  (
    'Self-Regulation',
    'When Reassurance Never Feels Like Enough',
    'A gentler way to meet the part of you scanning for certainty.',
    E'Sometimes reassurance lands and disappears before you can feel it. You ask one more question, revisit the conversation, or look for a signal that the connection is still there.\n\nThis does not mean you are too much. It may mean your nervous system has learned to search for safety outside of you when uncertainty arrives. The work is not to shame the search. It is to build a pause where you can listen for what is underneath it.',
    'A softer way to come home',
    8,
    'anxious'::public.attachment_style,
    1,
    date '2026-08-01'
  ),
  (
    'Communication',
    'Communicating Without Overexplaining',
    'Say what you need with clarity, warmth, and room for connection.',
    'Practice naming the need once, then leaving space for the other person to meet you.',
    null,
    6,
    null::public.attachment_style,
    2,
    date '2026-08-01'
  ),
  (
    'Boundaries',
    'A Boundary Is a Bridge, Not a Wall',
    'How clear limits can create more safety in your relationships.',
    'A boundary can protect closeness instead of ending it.',
    null,
    7,
    null::public.attachment_style,
    3,
    date '2026-08-01'
  ),
  (
    'Attachment',
    'Building Internal Security',
    'Small practices for becoming a steadier place to come home to.',
    'Security grows when you can stay with yourself inside uncertainty.',
    null,
    10,
    'secure'::public.attachment_style,
    4,
    date '2026-08-01'
  ),
  (
    'Conflict',
    'The Pause That Protects Connection',
    'Use space intentionally without turning it into distance.',
    'A pause is care when you return. It becomes distance only when you disappear.',
    null,
    5,
    'avoidant'::public.attachment_style,
    5,
    date '2026-08-01'
  ),
  (
    'Anxiety',
    'Tolerating the Quiet Between Messages',
    'A practice for the stories that arrive before the reply.',
    'The gap between messages is not proof. It is a place to practice staying.',
    null,
    6,
    'anxious'::public.attachment_style,
    6,
    date '2026-08-01'
  )
) as seed(category, title, summary, body, hero_label, read_minutes, recommended_for, sort_order, published_at)
where not exists (select 1 from public.articles);

insert into public.audio_sessions (title, category, duration_seconds, attachment_focus, is_featured, sort_order)
select * from (values
  ('Coming back to yourself', 'Secure connection', 600, 'secure'::public.attachment_style, true, 0),
  ('90-Second Nervous System Reset', 'Guided regulation', 90, null::public.attachment_style, false, 1),
  ('When You Feel Them Pulling Away', 'Attachment healing', 180, 'anxious'::public.attachment_style, false, 2),
  ('Creating Safety Before a Difficult Conversation', 'Guided regulation', 240, null::public.attachment_style, false, 3),
  ('Coming Back to Yourself', 'Attachment healing', 300, 'secure'::public.attachment_style, false, 4)
) as seed(title, category, duration_seconds, attachment_focus, is_featured, sort_order)
where not exists (select 1 from public.audio_sessions);

insert into public.exercises (title, summary, duration_minutes, attachment_style, sort_order)
select * from (values
  ('Calming the Fear of Losing Someone', 'Practice for anxious activation.', 6, 'anxious'::public.attachment_style, 1),
  ('Safe Vulnerability', 'Stay present while honoring your need for space.', 6, 'avoidant'::public.attachment_style, 2),
  ('Healthy Repair', 'Practice trust, boundaries, and healthy interdependence.', 6, 'secure'::public.attachment_style, 3)
) as seed(title, summary, duration_minutes, attachment_style, sort_order)
where not exists (select 1 from public.exercises);

insert into public.qa_items (question, answer, sort_order)
select * from (values
  (
    'Why do I panic when someone takes longer to reply?',
    'Patterns are learned responses, not fixed identities. With awareness and practice, new ways of responding become possible.',
    1
  ),
  (
    'Can attachment styles change?',
    'Patterns are learned responses, not fixed identities. With awareness and practice, new ways of responding become possible.',
    2
  ),
  (
    'How do secure people handle disagreements?',
    'Patterns are learned responses, not fixed identities. With awareness and practice, new ways of responding become possible.',
    3
  ),
  (
    'What is the difference between boundaries and avoidance?',
    'Patterns are learned responses, not fixed identities. With awareness and practice, new ways of responding become possible.',
    4
  )
) as seed(question, answer, sort_order)
where not exists (select 1 from public.qa_items);

insert into public.assessment_questions (prompt, sort_order)
select * from (values
  ('When someone I care about becomes distant, I tend to worry they are losing interest.', 1),
  ('I find it easy to name what I need in a relationship.', 2),
  ('When conflict begins, I prefer to withdraw and process alone.', 3),
  ('I can stay connected to myself while waiting for an answer.', 4),
  ('I feel comfortable depending on people I trust.', 5)
) as seed(prompt, sort_order)
where not exists (select 1 from public.assessment_questions);

insert into public.assessment_options (label, letter, style, sort_order)
select * from (values
  ('Worry and seek reassurance', 'A', 'anxious'::public.attachment_style, 1),
  ('Take space while staying connected', 'B', 'secure'::public.attachment_style, 2),
  ('Pull away and handle it alone', 'C', 'avoidant'::public.attachment_style, 3),
  ('Pause and respond with curiosity', 'D', 'secure'::public.attachment_style, 4)
) as seed(label, letter, style, sort_order)
where not exists (select 1 from public.assessment_options);

insert into public.notifications (user_id, title, body, icon)
select * from (values
  (null::uuid, 'Daily check-in ready', 'A gentle pause to notice how connected you feel today.', 'favourite'),
  (null::uuid, 'Continue your reading', 'When Reassurance Never Feels Like Enough is waiting for you.', 'book-open-01'),
  (null::uuid, 'Practice reminder', 'A 90-second reset can soften the next moment.', 'activity-01')
) as seed(user_id, title, body, icon)
where not exists (select 1 from public.notifications);
