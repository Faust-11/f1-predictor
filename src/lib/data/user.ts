import { getSessionPlayer } from "@/lib/supabase/server";
import type { User } from "@/types/user";

/** Current signed-in player, or null for guests. */
export async function getCurrentUser(): Promise<(User & { email: string | null }) | null> {
  const player = await getSessionPlayer();
  if (!player) return null;
  return {
    id: player.id,
    displayName: player.displayName,
    email: player.email,
    createdAt: "",
  };
}
