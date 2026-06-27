# Architecture.md

> Это единственный источник истины по структуре проекта и схеме базы данных. Если этот файл противоречит чему-то в `TZ.md` — прав этот файл в части архитектуры/БД, `TZ.md` прав в части бизнес-логики и UX. Не дублировать схему БД в других файлах.

---

## 1. Стек

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript (strict), TailwindCSS, shadcn/ui, Framer Motion
- **Backend:** Supabase (PostgreSQL + Row Level Security)
- **Хостинг:** Vercel (+ Vercel Cron для синхронизации)
- **API:** OpenF1 (основной), Jolpica (фоллбэк)

---

## 2. Структура проекта

```text
app/
  layout.tsx
  page.tsx                      # Главная
  calendar/
    page.tsx
  race/
    [raceId]/
      page.tsx                  # Прогноз/результаты гонки
  qualifying/
    [raceId]/
      page.tsx
  leaderboard/
    page.tsx
  history/
    page.tsx
  profile/
    page.tsx
  admin/
    page.tsx
    layout.tsx                  # проверка пароля админа
  api/
    sync/
      route.ts                  # дёргается Vercel Cron
    predictions/
      route.ts                  # server actions предпочтительнее, но если нужен route handler — здесь

components/
  layout/
    Header.tsx
    Footer.tsx
    Navbar.tsx
    ThemeToggle.tsx
  race/
    RaceCard.tsx
    Countdown.tsx
    CalendarGrid.tsx
  prediction/
    PredictionGrid.tsx
    PredictionSlot.tsx
    DriverModal.tsx
    DriverCard.tsx
    TeamCard.tsx
    DnfPicker.tsx
  results/
    ResultsTable.tsx
    PointsBreakdown.tsx
  leaderboard/
    LeaderboardTable.tsx
  shared/
    LoadingSkeleton.tsx
    ErrorState.tsx
    EmptyState.tsx

lib/
  supabase/
    client.ts                   # browser client
    server.ts                   # server client (Server Components/Actions)
    admin.ts                    # service-role client, только для cron/admin routes
  api/
    openf1.ts
    jolpica.ts
    sync.ts                     # нормализация + запись в Supabase
  scoring/
    calculate.ts                # движок подсчёта очков (раздел 14 TZ.md)
  i18n/
    strings.ts                  # единый словарь украинских строк интерфейса (см. ниже)
  identity.ts                   # анонимный user_id (cookie)
  utils.ts
  constants.ts

hooks/
  useRace.ts
  useDrivers.ts
  usePrediction.ts
  useCountdown.ts

types/
  driver.ts
  team.ts
  race.ts
  prediction.ts
  result.ts

middleware.ts                   # установка анонимного user_id cookie
```

---

## 3. Схема базы данных

> Каждая сущность ниже описана полностью. Если для конкретной задачи нужно поле, которого здесь нет — добавить его сюда и в типы `types/*`, а не придумывать на месте в компоненте.

```sql
-- Сезоны: лёгкая мультисезонность без полной историчности (см. раздел 8)
seasons (
  id            smallint primary key,   -- например 2026
  label         text not null,          -- "2026"
  is_active     boolean default false   -- текущий активный сезон для UI по умолчанию
)

teams (
  id            uuid primary key default gen_random_uuid(),
  season_id     smallint references seasons(id),
  name          text not null,
  logo_url      text,
  color_hex     text,
  api_team_id   text                    -- id из OpenF1/Jolpica для маппинга при синхронизации
)

drivers (
  id            uuid primary key default gen_random_uuid(),
  season_id     smallint references seasons(id),
  team_id       uuid references teams(id),
  first_name    text not null,
  last_name     text not null,
  code          varchar(3) not null,    -- "VER", "HAM"
  number        smallint,
  photo_url     text,
  country       text,
  api_driver_id text
)

races (
  id                 uuid primary key default gen_random_uuid(),
  season_id          smallint references seasons(id),
  round              smallint not null,
  name               text not null,
  country            text,
  circuit            text,
  qualifying_at_utc  timestamptz,
  race_at_utc        timestamptz,
  status             text not null default 'upcoming', -- upcoming | live | completed
  api_meeting_id     text
)

qualifying_results (
  race_id    uuid references races(id),
  driver_id  uuid references drivers(id),
  position   smallint not null,
  primary key (race_id, driver_id)
)

race_results (
  race_id    uuid references races(id),
  driver_id  uuid references drivers(id),
  position   smallint,         -- null, если не финишировал
  dnf        boolean default false,
  primary key (race_id, driver_id)
)

users (
  id            uuid primary key default gen_random_uuid(),  -- = анонимный cookie user_id
  display_name  text,
  created_at    timestamptz default now()
)

predictions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id),
  race_id     uuid references races(id),
  type        text not null,   -- qualifying_podium | qualifying_top10 | race_podium | race_top10 | race_dnf
  payload     jsonb not null,  -- { "1": driver_id, "2": driver_id, ... } или { "team_id": ... } / { "all_finish": true }
  points      integer,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, race_id, type)
)

sync_logs (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,    -- openf1 | jolpica
  endpoint    text,
  status      text not null,    -- success | error
  message     text,
  created_at  timestamptz default now()
)
```

### Почему так

- `season_id` на `teams`/`drivers`/`races` — это вся мультисезонность, нужная для MVP. Новый сезон = новые строки с новым `season_id`, без миграций.
- `drivers.team_id` фиксирован на сезон (не общая историческая связка пилот-команда) — осознанное упрощение. Если в будущем понадобится отслеживать смену команды **в середине** сезона — это отдельная задача (Phase 2, не MVP): добавить таблицу `driver_team_history` с диапазоном дат.
- `qualifying_results` и `race_results` — раздельные таблицы (как в исходном TZ.md), а не общая `Results` — потому что у гонки есть `dnf`, у квалификации его нет, и общая таблица заставила бы либо хранить лишние nullable-поля, либо городить enum "тип результата".
- `predictions.payload` — `jsonb`, а не отдельные колонки на каждую позицию — гибче при разных типах прогноза (подиум/топ10/сход), не нужно менять схему при правках UI.
- `sync_logs` — для отладки синхронизации (см. раздел "Безопасность и логирование").

---

## 4. Типы данных (TypeScript)

```typescript
// types/driver.ts
export interface Driver {
  id: string;
  seasonId: number;
  teamId: string;
  firstName: string;
  lastName: string;
  code: string;        // "VER"
  number: number | null;
  photoUrl: string | null;
  country: string | null;
}

// types/race.ts
export type RaceStatus = "upcoming" | "live" | "completed";

export interface Race {
  id: string;
  seasonId: number;
  round: number;
  name: string;
  country: string;
  circuit: string;
  qualifyingAtUtc: string;
  raceAtUtc: string;
  status: RaceStatus;
}

// types/prediction.ts
export type PredictionType =
  | "qualifying_podium"
  | "qualifying_top10"
  | "race_podium"
  | "race_top10"
  | "race_dnf";

export interface Prediction {
  id: string;
  userId: string;
  raceId: string;
  type: PredictionType;
  payload: Record<string, string> | { teamId: string } | { allFinish: true };
  points: number | null;
}
```

---

## 5. Поток данных

```text
OpenF1 (основной) ──┐
                     ├──▶ lib/api/sync.ts (нормализация) ──▶ Supabase (races/drivers/teams/results)
Jolpica (фоллбэк) ───┘                                            │
                                                                   ▼
                                                     Server Component (fetch напрямую из Supabase)
                                                                   │
                                                                   ▼
                                                          React Component (UI)
```

Запись в Supabase из синхронизации идёт через `lib/supabase/admin.ts` (service-role ключ, минуя RLS). Все остальные части приложения читают через `lib/supabase/server.ts` / `client.ts` с обычным anon-ключом, под RLS-политиками (раздел 7).

---

## 6. Кэширование и обновление данных

| Данные | Источник обновления | Интервал |
|---|---|---|
| Календарь сезона | Vercel Cron → `/api/sync` | 1 раз в сутки |
| Пилоты / команды | Vercel Cron → `/api/sync` | 1 раз в неделю, + ручной триггер из админки |
| Результаты квалификации/гонки | Vercel Cron | каждые 5 минут, но **только** для этапов со статусом `live` или с датой в пределах ±6 часов от текущего момента |
| Результаты для уже `completed` этапов | — | синхронизация останавливается, фиксируются как финальные |
| Общая синхронизация (фоллбэк) | Vercel Cron | каждые 30 минут (как было в TZ.md, раздел 17) — покрывает случаи, не охваченные более частыми интервалами выше |

Next.js: использовать `revalidate` для статичных частей (календарь, профили пилотов) и Server Components с прямым запросом к Supabase для данных, зависящих от пользователя (прогнозы, рейтинг).

---

## 7. Безопасность

- **RLS на `predictions`:** insert/update разрешены только если `user_id` совпадает с текущим анонимным cookie-id **и** `now() < race.qualifying_at_utc - interval '5 minutes'` (для quali-типов) / `now() < race.race_at_utc - interval '5 minutes'` (для race-типов). Проверка дедлайна — в Postgres-функции, не только на фронте.
- **RLS на `races`, `drivers`, `teams`, `qualifying_results`, `race_results`:** чтение открыто всем, запись — только через service-role (синхронизация/админка).
- **Уникальность:** `unique(user_id, race_id, type)` на `predictions` физически не даёт задвоить прогноз — повторное сохранение делает `upsert`, а не `insert`.
- **Админ-роуты:** защищены проверкой пароля из переменной окружения в `app/admin/layout.tsx` (middleware-уровень), не через Supabase Auth.

---

## 8. Многосезонность (план)

MVP: используется один активный сезон (2026), но `season_id` присутствует на всех ключевых таблицах с первого дня — это снимает необходимость в миграции при запуске сезона 2027.

**Не входит в MVP, но заложено как известный риск:** если пилот меняет команду в середине сезона (что в реальности случается редко, но бывает) — текущая схема не отследит это автоматически, придётся вручную поправить `drivers.team_id` через админку. Полноценное историческое моделирование — отдельная задача на будущее.

---

## 9. Риски и фоллбэки

- Сезон 2026 — новый состав грида: 11 команд (добавился Cadillac, Sauber переименован в заводскую команду Audi). На старте сезона API (особенно OpenF1) может отдавать неполные данные по новым участникам.
- **Фоллбэк:** держать в `lib/api/seed-data.ts` статичный JSON с актуальным составом пилотов/команд на старт сезона, который используется как начальное заполнение базы, если синхронизация при первом запуске вернёт пустой/неполный список. Админка позволяет поправить вручную.
- **Конкретные endpoint'ы OpenF1 для результатов:** `session_result` — финальная классификация сессии (квалификация/гонка), `starting_grid` — стартовая решётка. Не использовать `position`/`intervals` для итогового протокола — это телеметрия лайв-трекинга, а не финальный результат.
- **Риск платного доступа:** OpenF1 делит данные на "live" (с 30 минут до начала сессии до 30 минут после окончания — может требовать платную подписку) и "historical" (бесплатно, без авторизации). Наш cron опрашивает `session_result` каждые 5 минут именно в это "live"-окно, чтобы поймать результат как можно раньше — нужно на Phase 3 проверить без авторизации, отдаёт ли endpoint данные сразу после финиша сессии. Если нет — сдвинуть первый опрос на 5-10 минут после финиша или подключить платный тир. На этот случай уже есть фоллбэк на Jolpica и ручной ввод через админку.

---

## 10. Правила именования

| Что | Конвенция | Пример |
|---|---|---|
| Компоненты | PascalCase | `DriverModal.tsx` |
| Файлы (не компоненты) | kebab-case | `use-race.ts`, `sync-logs.ts` |
| Хуки | camelCase, префикс `use` | `usePrediction` |
| Константы | UPPER_SNAKE_CASE | `PREDICTION_LOCK_MINUTES` |
| Типы/интерфейсы | PascalCase | `Driver`, `RaceStatus` |
| Таблицы БД | snake_case, множественное число | `qualifying_results` |

---

## 11. Состояния интерфейса

Каждый компонент, получающий данные асинхронно, должен явно обрабатывать 5 состояний: **Loading** (skeleton, не спиннер), **Empty** (текст из раздела 15/16 TZ.md), **Error** (текст + retry), **Success**, и опционально **Stale** (показываем старые кэшированные данные с пометкой "оновлюється" во время ревалидации).

---

## 12. Дизайн-система

Цвета, шрифты, отступы, радиусы, состояния hover/active — в `UI_Guide.md`. Этот файл не содержит дизайн-токенов, чтобы не было двух источников правды по стилям.

---

## 13. Языковой словарь интерфейса

`lib/i18n/strings.ts` — единственное место, где живут все украинские строки публичного интерфейса (заголовки, кнопки, тексты ошибок и empty state, toast-сообщения):

```typescript
export const strings = {
  predictions: {
    save: "Зберегти прогноз",
    saved: "Прогноз збережено!",
    deadlinePassed: "Час для прогнозу на цей етап минув.",
  },
  states: {
    apiUnavailable: "Дані тимчасово недоступні. Спробуйте оновити сторінку пізніше.",
    resultsEmpty: "Результати з'являться після завершення етапу.",
    historyEmpty: "Ви ще не зробили жодного прогнозу. Перейдіть до найближчого етапу.",
  },
  // ...
} as const;
```

Компоненты импортируют тексты из `strings`, а не пишут их инлайн. Это не только архитектурная чистота — это главная защита от того, что агент при генерации нового текста "по наитию" соскользнёт на русский (которым написаны сами документы) вместо украинского: новый текст сначала добавляется здесь одной строкой, и его проще проверить глазами, чем искать разбросанные по компонентам строки.
