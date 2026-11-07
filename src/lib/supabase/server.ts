import { createServerClient as createSsrClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import type { Database } from "@/types/database";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  return { url, key };
}

/**
 * Server client bound to the visitor's Supabase Auth session (cookies).
 * RLS identifies the player via auth.uid() — no client-controlled headers.
 */
export async function createServerClient() {
  const { url, key } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createSsrClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — middleware refreshes the session.
        }
      },
    },
  });
}

export interface SessionPlayer {
  /** users.id — the player id used by predictions. */
  id: string;
  displayName: string | null;
  email: string | null;
}

/**
 * Current signed-in player (verified with Supabase Auth), or null for guests
 * and for signed-in accounts whose player row is not created yet.
 */
export const getSessionPlayer = cache(async (): Promise<SessionPlayer | null> => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, display_name, email")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return { id: data.id, displayName: data.display_name, email: data.email };
});

/** Player id of the signed-in visitor, or undefined for guests. */
export async function getServerUserId(): Promise<string | undefined> {
  return (await getSessionPlayer())?.id;
}
