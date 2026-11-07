import type { User as AuthUser } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ensures a player row exists for a verified Supabase Auth user (called from
 * the OAuth callback). Creates it with the Google name and email; keeps the
 * email in sync on later sign-ins. Server-only (service role).
 */
export async function ensurePlayerForAuthUser(user: AuthUser): Promise<void> {
  const admin = createAdminClient();
  const email = user.email ?? null;

  const { data: existing, error: findError } = await admin
    .from("users")
    .select("id, email")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (findError) throw new Error(findError.message);

  if (existing) {
    if (existing.email !== email) {
      await admin.from("users").update({ email }).eq("id", existing.id);
    }
    return;
  }

  const meta = user.user_metadata ?? {};
  const googleName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    null;

  const { error } = await admin.from("users").insert({
    auth_user_id: user.id,
    email,
    display_name: googleName,
  });
  if (error) throw new Error(error.message);
}
