-- Slipstream — історична база F1 (схема f1) + контент двома мовами (uk/en).
-- Run after 003_google_auth.sql.
--
-- Принципи:
--   * Статистика (сезони, гонки, сесії, результати, кола, піт-стопи, заліки) — з дампу Jolpica
--     (CC BY-NC-SA 4.0: некомерційно, з атрибуцією). Завантажувач: scripts/jolpica/load_dump.py.
--   * Сутності, на які посилається наш контент (сезони, траси, пілоти, команди, етапи), мають стабільні
--     природні ключі (year / ref / (season_year, number)) і оновлюються upsert'ом.
--   * Сесійні дані (сесії, результати, кола, піт-стопи, заліки) перезавантажуються цілком з кожного дампу.
--   * Контент (тексти, факти, історії, відео, фото) — лише наш; кожен факт має джерело і статус.
--   * Читання — публічне (anon), запис — лише service role (завантажувач, адмінка).

create schema if not exists f1;

-- ---------------------------------------------------------------------------
-- Сутності
-- ---------------------------------------------------------------------------

create table if not exists f1.seasons (
  year            smallint primary key,
  wikipedia_en    text,
  championship_system text
);

create table if not exists f1.circuits (
  id              bigint generated always as identity primary key,
  ref             text not null unique,
  name            text not null,
  locality        text,
  country         text,
  country_code    char(3),
  latitude        double precision,
  longitude       double precision,
  altitude_m      integer,
  wikipedia_en    text
);

create table if not exists f1.drivers (
  id              bigint generated always as identity primary key,
  ref             text not null unique,
  code            text,
  forename        text not null,
  surname         text not null,
  nationality     text,
  country_code    char(3),
  date_of_birth   date,
  permanent_number smallint,
  wikipedia_en    text
);

create table if not exists f1.teams (
  id              bigint generated always as identity primary key,
  ref             text not null unique,
  name            text not null,
  nationality     text,
  country_code    char(3),
  primary_color   text,
  wikipedia_en    text
);

-- Етап чемпіонату (Гран-прі).
create table if not exists f1.rounds (
  id              bigint generated always as identity primary key,
  season_year     smallint not null references f1.seasons(year) on delete cascade,
  number          smallint,                 -- null у скасованих етапів (напр. 2026 Saudi Arabian GP)
  race_number     integer,
  name            text not null,
  circuit_id      bigint references f1.circuits(id),
  date            date,
  is_cancelled    boolean not null default false,
  wikipedia_en    text,
  unique (season_year, number)
);
-- Скасовані етапи без номера ідентифікуються назвою в межах сезону.
create unique index if not exists rounds_unnumbered_name_idx on f1.rounds(season_year, name) where number is null;
create index if not exists rounds_circuit_idx on f1.rounds(circuit_id);

-- ---------------------------------------------------------------------------
-- Сесійні дані (перезавантажуються цілком)
-- ---------------------------------------------------------------------------

-- Склад команд по сезонах. role: 0 — основний, 1 — резервний, 2 — юніор.
create table if not exists f1.team_drivers (
  season_year     smallint not null references f1.seasons(year) on delete cascade,
  team_id         bigint not null references f1.teams(id) on delete cascade,
  driver_id       bigint not null references f1.drivers(id) on delete cascade,
  role            smallint,
  primary key (season_year, team_id, driver_id)
);
create index if not exists team_drivers_driver_idx on f1.team_drivers(driver_id);

-- type: R, SR (спринт), Q1/Q2/Q3, QB, QA, QO, PQ, SQ1–SQ3, FP1–FP3 (як у Jolpica).
create table if not exists f1.sessions (
  id              bigint generated always as identity primary key,
  src_id          integer unique,
  round_id        bigint not null references f1.rounds(id) on delete cascade,
  type            text not null,
  number          smallint,
  starts_at       timestamptz,
  timezone        text,
  scheduled_laps  smallint,
  completed_laps  smallint,
  is_cancelled    boolean not null default false,
  has_time_data   boolean not null default false
);
create index if not exists sessions_round_idx on f1.sessions(round_id);

-- Результат пілота в сесії.
-- status: 0 фініш, 1 відстав на коло(а), 10 аварія, 11 схід, 20 дискваліфікація,
--         30 не стартував, 40 не кваліфікувався, 41 не пройшов передкваліфікацію.
create table if not exists f1.results (
  id              bigint generated always as identity primary key,
  src_id          integer unique,
  session_id      bigint not null references f1.sessions(id) on delete cascade,
  driver_id       bigint not null references f1.drivers(id),
  team_id         bigint not null references f1.teams(id),
  car_number      smallint,
  position        smallint,
  grid            smallint,
  points          numeric(6,2),
  status          smallint,
  detail          text,
  is_classified   boolean,
  laps_completed  smallint,
  time_ms         bigint,
  fastest_lap_rank smallint
);
create index if not exists results_session_idx on f1.results(session_id);
create index if not exists results_driver_idx on f1.results(driver_id);
create index if not exists results_team_idx on f1.results(team_id);

-- Кола (з 1994). number = null — запис лише найшвидшого кола без номера (старі гонки).
create table if not exists f1.laps (
  result_id       bigint not null references f1.results(id) on delete cascade,
  number          smallint,
  position        smallint,
  time_ms         integer,
  is_deleted      boolean not null default false,
  is_fastest      boolean not null default false,
  avg_speed_kph   real
);
create index if not exists laps_result_idx on f1.laps(result_id, number);

-- Піт-стопи (з 2011).
create table if not exists f1.pit_stops (
  result_id       bigint not null references f1.results(id) on delete cascade,
  number          smallint,
  lap             smallint,
  duration_ms     integer,
  local_time      time
);
create index if not exists pit_stops_result_idx on f1.pit_stops(result_id);

-- Залік пілотів після кожної сесії з очками (для графіків боротьби за титул).
create table if not exists f1.driver_standings (
  season_year     smallint not null references f1.seasons(year) on delete cascade,
  round_number    smallint not null,
  session_number  smallint not null,
  driver_id       bigint not null references f1.drivers(id) on delete cascade,
  position        smallint,
  points          numeric(7,2),
  wins            smallint,
  highest_finish  smallint,
  is_eligible     boolean,
  adjustment_type smallint,
  primary key (season_year, round_number, session_number, driver_id)
);
create index if not exists driver_standings_driver_idx on f1.driver_standings(driver_id);

create table if not exists f1.team_standings (
  season_year     smallint not null references f1.seasons(year) on delete cascade,
  round_number    smallint not null,
  session_number  smallint not null,
  team_id         bigint not null references f1.teams(id) on delete cascade,
  position        smallint,
  points          numeric(7,2),
  wins            smallint,
  highest_finish  smallint,
  is_eligible     boolean,
  adjustment_type smallint,
  primary key (season_year, round_number, session_number, team_id)
);
create index if not exists team_standings_team_idx on f1.team_standings(team_id);

-- Службове: які дампи завантажено.
create table if not exists f1.data_loads (
  id              bigint generated always as identity primary key,
  source          text not null,
  file_sha256     text,
  uploaded_at     timestamptz,
  loaded_at       timestamptz not null default now(),
  row_counts      jsonb
);

-- ---------------------------------------------------------------------------
-- Контент (наш, двомовний)
-- ---------------------------------------------------------------------------

do $$ begin
  create type f1.lang as enum ('uk', 'en');
exception when duplicate_object then null; end $$;

do $$ begin
  create type f1.subject_type as enum ('season', 'round', 'driver', 'team', 'circuit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type f1.publish_status as enum ('draft', 'review', 'published');
exception when duplicate_object then null; end $$;

-- confirmed — дані результатів або ≥2 незалежні джерела; single_source — «за словами X»; disputed — версії розходяться.
do $$ begin
  create type f1.fact_status as enum ('confirmed', 'single_source', 'disputed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type f1.source_kind as enum ('data', 'official', 'press', 'column', 'book', 'podcast', 'video', 'wiki', 'other');
exception when duplicate_object then null; end $$;

-- Перекладені назви та тексти сутностей (ім'я пілота українською, «Гран-прі Монако», біографія…).
create table if not exists f1.subject_texts (
  subject_type    f1.subject_type not null,
  subject_id      bigint not null,          -- для season — рік
  lang            f1.lang not null,
  name            text,
  summary_md      text,
  body_md         text,
  status          f1.publish_status not null default 'draft',
  updated_at      timestamptz not null default now(),
  primary key (subject_type, subject_id, lang)
);

-- Посилання на статті Вікіпедії різними мовами (en вже є в сутностях; тут — uk та інші).
create table if not exists f1.wiki_links (
  subject_type    f1.subject_type not null,
  subject_id      bigint not null,
  lang            text not null,
  title           text not null,
  primary key (subject_type, subject_id, lang)
);

create table if not exists f1.sources (
  id              bigint generated always as identity primary key,
  url             text not null unique,
  title           text,
  publisher       text,
  author          text,
  kind            f1.source_kind not null default 'other',
  lang            text,
  published_on    date,
  accessed_on     date not null default current_date,
  note            text
);

-- Атомарний факт про сутність. Публікується лише з принаймні одним джерелом (перевіряє адмінка/скрипт).
create table if not exists f1.facts (
  id              bigint generated always as identity primary key,
  subject_type    f1.subject_type not null,
  subject_id      bigint not null,
  status          f1.fact_status not null,
  text_uk         text,
  text_en         text,
  publish         f1.publish_status not null default 'draft',
  created_at      timestamptz not null default now()
);
create index if not exists facts_subject_idx on f1.facts(subject_type, subject_id);

create table if not exists f1.fact_sources (
  fact_id         bigint not null references f1.facts(id) on delete cascade,
  source_id       bigint not null references f1.sources(id) on delete restrict,
  quote           text,                     -- коротка цитата (< 15 слів), з авторством
  locator         text,                     -- сторінка / таймкод / розділ
  primary key (fact_id, source_id)
);

-- Довгі історії (інтриги, епохи, легендарні гонки) з виносками.
create table if not exists f1.stories (
  id              bigint generated always as identity primary key,
  slug            text not null unique,
  status          f1.publish_status not null default 'draft',
  published_at    timestamptz,
  updated_at      timestamptz not null default now()
);

create table if not exists f1.story_texts (
  story_id        bigint not null references f1.stories(id) on delete cascade,
  lang            f1.lang not null,
  title           text not null,
  dek             text,
  body_md         text not null,            -- виноски у форматі [^n] → story_sources.note_no
  primary key (story_id, lang)
);

create table if not exists f1.story_subjects (
  story_id        bigint not null references f1.stories(id) on delete cascade,
  subject_type    f1.subject_type not null,
  subject_id      bigint not null,
  primary key (story_id, subject_type, subject_id)
);

create table if not exists f1.story_sources (
  story_id        bigint not null references f1.stories(id) on delete cascade,
  note_no         smallint not null,
  source_id       bigint not null references f1.sources(id) on delete restrict,
  locator         text,
  primary key (story_id, note_no)
);

-- Відео — лише вбудовування YouTube, без копіювання.
create table if not exists f1.videos (
  id              bigint generated always as identity primary key,
  youtube_id      text not null unique,
  title           text,
  channel         text,
  published_on    date,
  duration_s      integer,
  checked_at      timestamptz             -- остання перевірка, що відео доступне й вбудовується
);

create table if not exists f1.video_subjects (
  video_id        bigint not null references f1.videos(id) on delete cascade,
  subject_type    f1.subject_type not null,
  subject_id      bigint not null,
  primary key (video_id, subject_type, subject_id)
);

-- Зображення лише з вільною ліцензією (Wikimedia Commons тощо) і з атрибуцією.
create table if not exists f1.images (
  id              bigint generated always as identity primary key,
  subject_type    f1.subject_type not null,
  subject_id      bigint not null,
  url             text not null,
  source_page     text,
  license         text not null,
  author          text,
  attribution     text not null,
  is_primary      boolean not null default false
);
create index if not exists images_subject_idx on f1.images(subject_type, subject_id);

-- ---------------------------------------------------------------------------
-- Доступ: публічне читання, запис лише service role.
-- (Додати схему f1 у Supabase → Settings → API → Exposed schemas.)
-- ---------------------------------------------------------------------------

grant usage on schema f1 to anon, authenticated, service_role;
grant select on all tables in schema f1 to anon, authenticated;
grant all on all tables in schema f1 to service_role;
grant usage, select on all sequences in schema f1 to service_role;
alter default privileges in schema f1 grant select on tables to anon, authenticated;
alter default privileges in schema f1 grant all on tables to service_role;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'f1' loop
    execute format('alter table f1.%I enable row level security', t);
    execute format('drop policy if exists "public_read" on f1.%I', t);
    -- Робочі матеріали (чернетки) не видно публічно.
    if t in ('subject_texts', 'stories') then
      execute format('create policy "public_read" on f1.%I for select to anon, authenticated using (status = ''published'')', t);
    elsif t = 'facts' then
      execute 'create policy "public_read" on f1.facts for select to anon, authenticated using (publish = ''published'')';
    elsif t = 'fact_sources' then
      execute 'create policy "public_read" on f1.fact_sources for select to anon, authenticated using (exists (select 1 from f1.facts f where f.id = fact_id and f.publish = ''published''))';
    elsif t in ('story_texts', 'story_subjects', 'story_sources') then
      execute format('create policy "public_read" on f1.%I for select to anon, authenticated using (exists (select 1 from f1.stories s where s.id = story_id and s.status = ''published''))', t);
    elsif t = 'data_loads' then
      null; -- службова таблиця: без публічного читання
    else
      execute format('create policy "public_read" on f1.%I for select to anon, authenticated using (true)', t);
    end if;
  end loop;
end $$;

revoke select on f1.data_loads from anon, authenticated;
