import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { USER_ID_COOKIE } from "@/lib/constants";
import type { Database } from "@/types/database";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  return { url, key };
}

/** Server client with x-user-id header for RLS (reads httpOnly cookie). */
export async function createServerClient() {
  const { url, key } = getSupabaseEnv();
  const cookieStore = await cookies();
  const userId = cookieStore.get(USER_ID_COOKIE)?.value;

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: userId ? { "x-user-id": userId } : {},
    },
  });
}

export async function getServerUserId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(USER_ID_COOKIE)?.value;
}
