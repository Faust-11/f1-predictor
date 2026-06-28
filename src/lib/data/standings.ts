import { teamNameToApiId } from "@/lib/api/team-slug";
import { ACTIVE_SEASON_ID } from "@/lib/constants";

import { getDriversWithTeams } from "./drivers";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";
// Standings only change ~once per race weekend — cache for an hour.
const REVALIDATE_SECONDS = 3600;

export interface DriverStandingEntry {
  position: number;
  points: number;
  wins: number;
  code: string;
  name: string;
  teamName: string;
  teamColor: string | null;
  photoUrl: string | null;
}

export interface ConstructorStandingEntry {
  position: number;
  points: number;
  wins: number;
  name: string;
  teamColor: string | null;
}

export interface SeasonStandings {
  drivers: DriverStandingEntry[];
  constructors: ConstructorStandingEntry[];
}

interface JolpicaDriverStanding {
  position: string;
  points: string;
  wins: string;
  Driver: {
    code?: string;
    givenName: string;
    familyName: string;
  };
  Constructors: { name: string; constructorId: string }[];
}

interface JolpicaConstructorStanding {
  position: string;
  points: string;
  wins: string;
  Constructor: { name: string; constructorId: string };
}

async function fetchJolpica<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}/${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${path}`);
  }
  return response.json() as Promise<T>;
}

/**
 * Season standings from Jolpica, enriched with driver photos and team colours
 * already stored in our database (matched by driver code / team name).
 */
export async function getStandings(): Promise<SeasonStandings> {
  const [driverData, constructorData, dbDrivers] = await Promise.all([
    fetchJolpica<{
      MRData: {
        StandingsTable: {
          StandingsLists: Array<{ DriverStandings?: JolpicaDriverStanding[] }>;
        };
      };
    }>(`${ACTIVE_SEASON_ID}/driverStandings.json`),
    fetchJolpica<{
      MRData: {
        StandingsTable: {
          StandingsLists: Array<{
            ConstructorStandings?: JolpicaConstructorStanding[];
          }>;
        };
      };
    }>(`${ACTIVE_SEASON_ID}/constructorStandings.json`),
    getDriversWithTeams().catch(() => []),
  ]);

  const colorByTeamId = new Map<string, string | null>();
  for (const d of dbDrivers) {
    if (d.team?.name) {
      colorByTeamId.set(teamNameToApiId(d.team.name), d.team.colorHex);
    }
  }

  const driverList =
    driverData.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
  const drivers: DriverStandingEntry[] = driverList.map((row) => {
    const code = row.Driver.code ?? "";
    const constructor = row.Constructors[row.Constructors.length - 1];
    const teamId = constructor ? teamNameToApiId(constructor.name) : "";
    return {
      position: Number(row.position),
      points: Number(row.points),
      wins: Number(row.wins),
      code,
      name: `${row.Driver.givenName} ${row.Driver.familyName}`,
      teamName: constructor?.name ?? "",
      teamColor: colorByTeamId.get(teamId) ?? null,
      // Curated local headshots (public/drivers/CODE.webp).
      photoUrl: code ? `/drivers/${code.toUpperCase()}.webp` : null,
    };
  });

  const constructorList =
    constructorData.MRData.StandingsTable.StandingsLists[0]
      ?.ConstructorStandings ?? [];
  const constructors: ConstructorStandingEntry[] = constructorList.map((row) => ({
    position: Number(row.position),
    points: Number(row.points),
    wins: Number(row.wins),
    name: row.Constructor.name,
    teamColor: colorByTeamId.get(teamNameToApiId(row.Constructor.name)) ?? null,
  }));

  return { drivers, constructors };
}
