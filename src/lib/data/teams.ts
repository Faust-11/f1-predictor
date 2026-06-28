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

  // Collapse duplicate rows (same name) that a past bad sync may have created.
  const byName = new Map<string, Team>();
  for (const row of data ?? []) {
    const team = mapTeamRow(row);
    if (!byName.has(team.name)) byName.set(team.name, team);
  }
  return [...byName.values()];
}
