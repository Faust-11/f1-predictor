import { cookies } from "next/headers";

import { USER_ID_COOKIE } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export async function getUserIdFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(USER_ID_COOKIE)?.value;
}

/** Ensures a users row exists for the anonymous cookie id (lazy registration). */
export async function ensureUserExists(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("users").upsert(
    { id: userId },
    { onConflict: "id", ignoreDuplicates: true },
  );

  if (error) {
    throw new Error(`Failed to ensure user exists: ${error.message}`);
  }
}

/** Returns user id from cookie and ensures the users row exists. */
export async function getOrCreateUserId(): Promise<string | undefined> {
  const userId = await getUserIdFromCookies();
  if (!userId) {
    return undefined;
  }

  await ensureUserExists(userId);
  return userId;
}

/** Server client scoped to the current anonymous user (RLS via x-user-id header). */
export async function getAuthenticatedServerClient() {
  const userId = await getOrCreateUserId();
  if (!userId) {
    throw new Error("Anonymous user cookie is missing");
  }
  return await createServerClient();
}
