import { ACTIVE_SEASON_ID } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { mapDriverRow, type Driver } from "@/types/driver";
import { mapTeamRow, type Team, type TeamRow } from "@/types/team";

export interface DriverWithTeam extends Driver {
  team: Team | null;
}

type DriverWithTeamRow = Parameters<typeof mapDriverRow>[0] & {
  teams: TeamRow | null;
};

/** All drivers for the active season with their team, ordered by team then number. */
export async function getDriversWithTeams(): Promise<DriverWithTeam[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("drivers")
    .select("*, teams(*)")
    .eq("season_id", ACTIVE_SEASON_ID)
    .order("number", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as DriverWithTeamRow[]).map((row) => {
    const driver = mapDriverRow(row);
    return {
      ...driver,
      // Curated local headshots (public/drivers/CODE.webp) are the authoritative
      // source — OpenF1 no longer serves real photos. Falls back to the code
      // initials avatar if a file is missing.
      photoUrl: row.code ? `/drivers/${row.code.toUpperCase()}.webp` : driver.photoUrl,
      team: row.teams ? mapTeamRow(row.teams) : null,
    };
  });
}

/** Lookup map keyed by driver id. */
export async function getDriverMap(): Promise<Map<string, DriverWithTeam>> {
  const drivers = await getDriversWithTeams();
  return new Map(drivers.map((d) => [d.id, d]));
}
