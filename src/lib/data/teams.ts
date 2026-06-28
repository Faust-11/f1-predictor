import { ACTIVE_SEASON_ID } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { mapTeamRow, type Team } from "@/types/team";

/** All teams for the active season, ordered by name. */
export async function getTeams(): Promise<Team[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("season_id", ACTIVE_SEASON_ID)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapTeamRow);
}
