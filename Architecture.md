# [Architecture.md](http://Architecture.md)

- **Frontend:** Next.js 15 (App Router), TypeScript, TailwindCSS.

- **UI Components:** shadcn/ui.

- **State Management:** React Hooks, URL search params for filtering.

- **Data Fetching:** Server Components + Supabase client for real-time data.

- **Database:** Supabase (PostgreSQL).

- **Schema:**

    - Users: id, name, created_at

    - Predictions: user_id, race_id, type, prediction_json, points

    - Results: race_id, driver_id, position

- **Styling:** F1 Branding (Red: #FF1801, Black: #000000, White: #FFFFFF).