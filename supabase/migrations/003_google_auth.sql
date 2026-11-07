-- Slipstream — перехід з анонімної cookie на Supabase Auth (Google).
-- Run after 002_rls_policies.sql (SQL Editor, одним запуском).
--
-- Що виправляє:
--   * RLS більше НЕ довіряє заголовку x-user-id (його міг підставити будь-хто з публічним anon-ключем).
--     Гравець визначається лише за перевіреною сесією Supabase Auth: auth.uid().
--   * anon (неавторизовані) не можуть ні створювати гравців, ні писати прогнози.
--   * Гравець може змінювати лише своє display_name; auth_user_id та email — тільки сервер (service role).
--
-- Старі гравці (рядки users без auth_user_id) зберігаються з усіма прогнозами й очками;
-- прив'язку до Google-акаунта робить адмін на /admin.

alter table users add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;
alter table users add column if not exists email text;

-- Поточний гравець = рядок users, прив'язаний до сесії Supabase Auth.
create or replace function public.request_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_user_id = auth.uid() limit 1;
$$;

-- users -------------------------------------------------------------------
drop policy if exists "users_insert_own" on users;
drop policy if exists "users_select_own" on users;
drop policy if exists "users_update_own" on users;

-- Рядок гравця створює лише сервер (service role) після входу через Google.
create policy "users_select_own"
  on users for select
  to authenticated
  using (auth_user_id = auth.uid());

create policy "users_update_own"
  on users for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

revoke insert, update, delete on users from anon, authenticated;
grant update (display_name) on users to authenticated;

-- predictions -------------------------------------------------------------
drop policy if exists "predictions_select_own" on predictions;
drop policy if exists "predictions_insert_own" on predictions;
drop policy if exists "predictions_update_own" on predictions;

create policy "predictions_select_own"
  on predictions for select
  to authenticated
  using (user_id = public.request_user_id());

create policy "predictions_insert_own"
  on predictions for insert
  to authenticated
  with check (
    user_id = public.request_user_id()
    and public.is_prediction_before_deadline(race_id, type)
    and points is null
  );

create policy "predictions_update_own"
  on predictions for update
  to authenticated
  using (
    user_id = public.request_user_id()
    and public.is_prediction_before_deadline(race_id, type)
  )
  with check (
    user_id = public.request_user_id()
    and public.is_prediction_before_deadline(race_id, type)
  );

revoke insert, update, delete on predictions from anon;
-- points рахує лише сервер. upsert (on conflict do update) переписує всі передані колонки,
-- тому дозволяємо їх, а user_id/race_id додатково обмежені політиками вище.
revoke insert, update on predictions from authenticated;
grant insert (user_id, race_id, type, payload) on predictions to authenticated;
grant update (user_id, race_id, type, payload, updated_at) on predictions to authenticated;
