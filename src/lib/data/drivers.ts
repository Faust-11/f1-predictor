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

/** Driver code (or id fallback) used to collapse duplicate rows. */
function dedupeKey(d: DriverWithTeam): string {
  return (d.code || d.id).toUpperCase();
}

/** Pick one canonical driver per code (prefer the row that has a team). */
function canonicalByKey(rows: DriverWithTeam[]): Map<string, DriverWithTeam> {
  const map = new Map<string, DriverWithTeam>();
  for (const d of rows) {
    const key = dedupeKey(d);
    const existing = map.get(key);
    if (!existing || (!existing.team && d.team)) {
      map.set(key, d);
    }
  }
  return map;
}

/** Every driver row (incl. duplicates from past bad syncs), mapped to domain. */
async function fetchDriverRows(): Promise<DriverWithTeam[]> {
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
      photoUrl: row.code
        ? `/drivers/${row.code.toUpperCase()}.webp`
        : driver.photoUrl,
      team: row.teams ? mapTeamRow(row.teams) : null,
    };
  });
}

/** Deduplicated drivers (one per code) — for selection lists / standings. */
export async function getDriversWithTeams(): Promise<DriverWithTeam[]> {
  const rows = await fetchDriverRows();
  return [...canonicalByKey(rows).values()];
}

/**
 * Map of EVERY driver id (including duplicate rows) to its canonical driver,
 * so predictions/results that reference a duplicate id still resolve correctly.
 */
export async function getDriverMap(): Promise<Map<string, DriverWithTeam>> {
  const rows = await fetchDriverRows();
  const canonical = canonicalByKey(rows);
  const map = new Map<string, DriverWithTeam>();
  for (const d of rows) {
    map.set(d.id, canonical.get(dedupeKey(d)) ?? d);
  }
  return map;
}
