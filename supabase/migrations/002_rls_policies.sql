-- F1 Predictor 2026 — RLS policies (Architecture.md §7)
-- Run after 001_initial_schema.sql

-- Helper: read anonymous user id from x-user-id request header (set by server Supabase client)
create or replace function public.request_user_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  headers json;
  uid text;
begin
  headers := nullif(current_setting('request.headers', true), '')::json;
  if headers is null then
    return null;
  end if;
  uid := headers ->> 'x-user-id';
  if uid is null or uid = '' then
    return null;
  end if;
  return uid::uuid;
exception
  when others then
    return null;
end;
$$;

-- Helper: prediction deadline check (5 minutes before session start)
create or replace function public.is_prediction_before_deadline(
  p_race_id uuid,
  p_type text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_qualifying_at timestamptz;
  v_race_at timestamptz;
begin
  select qualifying_at_utc, race_at_utc
  into v_qualifying_at, v_race_at
  from races
  where id = p_race_id;

  if not found then
    return false;
  end if;

  if p_type in ('qualifying_podium', 'qualifying_top10') then
    if v_qualifying_at is null then
      return false;
    end if;
    return now() < v_qualifying_at - interval '5 minutes';
  end if;

  if p_type in ('race_podium', 'race_top10', 'race_dnf') then
    if v_race_at is null then
      return false;
    end if;
    return now() < v_race_at - interval '5 minutes';
  end if;

  return false;
end;
$$;

-- Enable RLS on all public tables
alter table seasons enable row level security;
alter table teams enable row level security;
alter table drivers enable row level security;
alter table races enable row level security;
alter table qualifying_results enable row level security;
alter table race_results enable row level security;
alter table users enable row level security;
alter table predictions enable row level security;
alter table sync_logs enable row level security;

-- seasons: public read
create policy "seasons_select_public"
  on seasons for select
  to anon, authenticated
  using (true);

-- teams, drivers, races, results: public read, no anon write
create policy "teams_select_public"
  on teams for select to anon, authenticated using (true);

create policy "drivers_select_public"
  on drivers for select to anon, authenticated using (true);

create policy "races_select_public"
  on races for select to anon, authenticated using (true);

create policy "qualifying_results_select_public"
  on qualifying_results for select to anon, authenticated using (true);

create policy "race_results_select_public"
  on race_results for select to anon, authenticated using (true);

-- users: create own row, read/update own row
create policy "users_insert_own"
  on users for insert
  to anon, authenticated
  with check (id = public.request_user_id());

create policy "users_select_own"
  on users for select
  to anon, authenticated
  using (id = public.request_user_id());

create policy "users_update_own"
  on users for update
  to anon, authenticated
  using (id = public.request_user_id())
  with check (id = public.request_user_id());

-- predictions: own rows only, before deadline
create policy "predictions_select_own"
  on predictions for select
  to anon, authenticated
  using (user_id = public.request_user_id());

create policy "predictions_insert_own"
  on predictions for insert
  to anon, authenticated
  with check (
    user_id = public.request_user_id()
    and public.is_prediction_before_deadline(race_id, type)
  );

create policy "predictions_update_own"
  on predictions for update
  to anon, authenticated
  using (
    user_id = public.request_user_id()
    and public.is_prediction_before_deadline(race_id, type)
  )
  with check (
    user_id = public.request_user_id()
    and public.is_prediction_before_deadline(race_id, type)
  );

-- sync_logs: no public access (service role only)
create policy "sync_logs_no_anon"
  on sync_logs for all
  to anon, authenticated
  using (false)
  with check (false);
