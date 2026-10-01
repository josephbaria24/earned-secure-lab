-- Run this once in the Supabase SQL Editor after schema.sql.
-- Lets the app save a membership and show member emails to admins.

alter table public.profiles add column if not exists email text;

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', 'New'),
    coalesce(new.raw_user_meta_data->>'last_name', 'Member'),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email,
        first_name = coalesce(public.profiles.first_name, excluded.first_name),
        last_name = coalesce(public.profiles.last_name, excluded.last_name);

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.start_membership(plan_interval text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
  months int;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select id into pid
  from public.plans
  where interval = plan_interval::public.plan_interval;

  if pid is null then
    raise exception 'Unknown plan';
  end if;

  months := case when plan_interval = 'annual' then 12 else 1 end;

  insert into public.subscriptions (user_id, plan_id, status, ends_at)
  values (auth.uid(), pid, 'active', now() + make_interval(months => months));

  update public.profiles
  set role = 'subscriber',
      trial_ends_at = now()
  where id = auth.uid()
    and role <> 'admin';
end;
$$;

grant execute on function public.start_membership(text) to authenticated;
