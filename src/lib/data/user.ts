import { createServerClient, getServerUserId } from "@/lib/supabase/server";
import { mapUserRow, type User } from "@/types/user";

/** Current anonymous user's row (RLS scopes to own id). Null if not yet created. */
export async function getCurrentUser(): Promise<User | null> {
  const userId = await getServerUserId();
  if (!userId) return null;

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapUserRow(data) : null;
}
