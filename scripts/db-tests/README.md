# Локальна перевірка міграцій і прав доступу

Лише для **локальної** тестової бази (не для Supabase!).

1. Порожній Postgres 15+ (напр. `npx embedded-postgres`, Docker `postgres:17`).
2. `supabase_stub.sql` — ролі anon/authenticated/service_role і заглушка `auth.uid()` як у Supabase.
3. Застосувати `supabase/migrations/001…004` по черзі.
4. `python3 scripts/jolpica/load_dump.py --zip dump_csv.zip` (з `DATABASE_URL` локальної бази).
5. `TEST_DATABASE_URL=… python3 scripts/db-tests/rls_smoke.py` — усі рядки мають бути `PASS`.
