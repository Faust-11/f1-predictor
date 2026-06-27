-- F1 Predictor 2026 — initial schema (Architecture.md §3)
-- Apply in Supabase SQL Editor or via supabase db push

create table if not exists seasons (
  id         smallint primary key,
  label      text not null,
  is_active  boolean not null default false
);

create table if not exists teams (
  id           uuid primary key default gen_random_uuid(),
  season_id    smallint not null references seasons(id),
  name         text not null,
  logo_url     text,
  color_hex    text,
  api_team_id  text
);

create table if not exists drivers (
  id             uuid primary key default gen_random_uuid(),
  season_id      smallint not null references seasons(id),
  team_id        uuid not null references teams(id),
  first_name     text not null,
  last_name      text not null,
  code           varchar(3) not null,
  number         smallint,
  photo_url      text,
  country        text,
  api_driver_id  text
);

create table if not exists races (
  id                 uuid primary key default gen_random_uuid(),
  season_id          smallint not null references seasons(id),
  round              smallint not null,
  name               text not null,
  country            text,
  circuit            text,
  qualifying_at_utc  timestamptz,
  race_at_utc        timestamptz,
  status             text not null default 'upcoming'
                     check (status in ('upcoming', 'live', 'completed')),
  api_meeting_id     text,
  unique (season_id, round)
);

create table if not exists qualifying_results (
  race_id    uuid not null references races(id) on delete cascade,
  driver_id  uuid not null references drivers(id),
  position   smallint not null check (position >= 1),
  primary key (race_id, driver_id)
);

create table if not exists race_results (
  race_id    uuid not null references races(id) on delete cascade,
  driver_id  uuid not null references drivers(id),
  position   smallint check (position is null or position >= 1),
  dnf        boolean not null default false,
  primary key (race_id, driver_id)
);

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  display_name  text,
  created_at    timestamptz not null default now()
);

create table if not exists predictions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  race_id     uuid not null references races(id) on delete cascade,
  type        text not null
              check (type in (
                'qualifying_podium', 'qualifying_top10',
                'race_podium', 'race_top10', 'race_dnf'
              )),
  payload     jsonb not null,
  points      integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, race_id, type)
);

create table if not exists sync_logs (
  id          uuid primary key default gen_random_uuid(),
  source      text not null check (source in ('openf1', 'jolpica')),
  endpoint    text,
  status      text not null check (status in ('success', 'error')),
  message     text,
  created_at  timestamptz not null default now()
);

-- Seed active season
insert into seasons (id, label, is_active)
values (2026, '2026', true)
on conflict (id) do update set is_active = excluded.is_active;

-- Indexes for common queries
create index if not exists idx_races_season_status on races (season_id, status);
create index if not exists idx_drivers_season on drivers (season_id);
create index if not exists idx_teams_season on teams (season_id);
create index if not exists idx_predictions_user on predictions (user_id);
create index if not exists idx_sync_logs_created on sync_logs (created_at desc);
