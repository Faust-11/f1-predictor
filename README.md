# F1 Predictor 2026

Веб-сервіс для прогнозування результатів етапів Formula 1 (кваліфікація та гонка),
з підрахунком очок та рейтингом користувачів. Інтерфейс — українською.

Стек: **Next.js 16 (App Router) · React 19 · TypeScript · TailwindCSS · shadcn/ui (base-ui) · Framer Motion · Supabase (PostgreSQL + RLS) · Vercel**.

Джерело істини по архітектурі та схемі БД — [`Architecture.md`](./Architecture.md);
бізнес-логіка та UX — [`TZ.md`](./TZ.md); дизайн-токени — [`UI_Guide.md`](./UI_Guide.md).

## Налаштування

1. Скопіюйте змінні оточення:

   ```bash
   cp .env.example .env.local
   ```

   Заповніть:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — публічні ключі Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` — service-role ключ (тільки сервер: cron, адмінка, лідерборд)
   - `ADMIN_PASSWORD` — пароль до `/admin`
   - `CRON_SECRET` — токен для Vercel Cron (заголовок `Authorization: Bearer <CRON_SECRET>`)

2. Застосуйте міграції у Supabase (SQL Editor), по порядку:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`

3. Запустіть застосунок:

   ```bash
   npm install
   npm run dev
   ```

   Відкрийте [http://localhost:3000](http://localhost:3000).

## Наповнення даними

Дані (календар, пілоти, команди, результати) синхронізуються з OpenF1 (основне джерело)
та Jolpica (фоллбек). Запустити синхронізацію вручну:

```
GET /api/sync?scope=full        # календар + ростер + результати
GET /api/sync?scope=calendar    # тільки календар
GET /api/sync?scope=roster      # тільки команди/пілоти
GET /api/sync?scope=results     # тільки результати (live / ±6 год)
```

У продакшені запит потребує заголовок `Authorization: Bearer <CRON_SECRET>`.
Розклад cron — у [`vercel.json`](./vercel.json). Ручний запуск і корекція також доступні в `/admin`.

Якщо API віддає неповний ростер на старті сезону, використовується статичний
фоллбек з [`src/lib/api/seed-data.ts`](./src/lib/api/seed-data.ts).

## Структура

- `src/app` — сторінки (головна, календар, кваліфікація/гонка, рейтинг, історія, профіль, адмінка) + `api/sync`
- `src/components` — `layout`, `race`, `prediction`, `results`, `leaderboard`, `admin`, `shared`, `ui`
- `src/lib` — `supabase` (клієнти), `api` (OpenF1/Jolpica/sync), `data` (запити), `scoring` (рушій очок),
  `predictions` (дедлайни/типи), `actions` (Server Actions), `i18n` (строки/дати)
- `src/types` — доменні типи + мапери row↔domain; `database.ts` — типи Supabase
- `supabase/migrations` — SQL-схема та RLS

## Підрахунок очків (TZ §14)

P1 — 10, P2 — 8, P3 — 6, P4–P10 — по 3 за точну позицію. Бонуси: весь подіум +10, вся десятка +30.
Схід (гонка): вгадана команда-сход або «усі фінішують» +10. Очки перераховуються автоматично
при появі результатів (статус етапу → `completed`), а також вручну з адмінки.

## Команди

```bash
npm run dev      # розробка
npm run build    # продакшн-білд
npm run start    # запуск продакшн-білду
npm run lint     # ESLint
```

> Примітка для локальної розробки на macOS/Linux: нативні бінарники `lightningcss`
> та `@next/swc` підтягуються під вашу платформу автоматично при `npm install`.
> Якщо білд скаржиться на відсутній нативний модуль — перевстановіть залежності
> на цій машині (`rm -rf node_modules && npm install`).
