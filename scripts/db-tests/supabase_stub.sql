create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create extension if not exists pgcrypto;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
