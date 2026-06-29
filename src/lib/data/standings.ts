import { countryToIso } from "@/lib/country-flag";
import { teamNameToApiId } from "@/lib/api/team-slug";
import { ACTIVE_SEASON_ID } from "@/lib/constants";

import { getDriversWithTeams } from "./drivers";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";
// Standings only change ~once per race weekend — cache for an hour.
const REVALIDATE_SECONDS = 3600;

export interface StandingsRound {
  round: number;
  name: string;
  countryIso: string | null;
}

export interface DriverStandingEntry {
  position: number;
  points: number;
  wins: number;
  code: string;
  name: string;
  teamName: string;
  teamColor: string | null;
  photoUrl: string | null;
  /** round → points earned that GP (race + sprint). */
  perGp: Record<number, number>;
}

export interface ConstructorStandingEntry {
  position: number;
  points: number;
  wins: number;
  name: string;
  teamColor: string | null;
  perGp: Record<number, number>;
}

export interface SeasonStandings {
  drivers: DriverStandingEntry[];
  constructors: ConstructorStandingEntry[];
  rounds: StandingsRound[];
}

interface JolpicaDriverStanding {
  position: string;
  points: string;
  wins: string;
  Driver: { code?: string; givenName: string; familyName: string };
  Constructors: { name: string; constructorId: string }[];
}

interface JolpicaConstructorStanding {
  position: string;
  points: string;
  wins: string;
  Constructor: { name: string; constructorId: string };
}

interface SeasonResultRow {
  Driver: { code?: string };
  points: string;
  Constructor: { constructorId: string };
}

interface SeasonRace {
  round: string;
  raceName: string;
  Circuit?: { Location?: { country?: string } };
  Results?: SeasonResultRow[];
  SprintResults?: SeasonResultRow[];
}

interface RoundResults {
  round: number;
  name: string;
  country: string;
  rows: { code: string; points: number; constructorId: string }[];
}

async function fetchJolpica<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${BASE_URL}/${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** All season results (race or sprint), merged by round across paginated pages. */
async function fetchAllRaces(
  path: "results" | "sprint",
  key: "Results" | "SprintResults",
): Promise<Map<number, RoundResults>> {
  const byRound = new Map<number, RoundResults>();
  const limit = 100;
  let offset = 0;

  for (let guard = 0; guard < 20; guard++) {
    const data = await fetchJolpica<{
      MRData: { total: string; RaceTable: { Races: SeasonRace[] } };
    }>(`${ACTIVE_SEASON_ID}/${path}.json?limit=${limit}&offset=${offset}`);
    if (!data) break;

    const races = data.MRData.RaceTable.Races ?? [];
    let got = 0;
    for (const race of races) {
      const round = Number(race.round);
      const entry = byRound.get(round) ?? {
        round,
        name: race.raceName,
        country: race.Circuit?.Location?.country ?? "",
        rows: [],
      };
      const results = (key === "Results" ? race.Results : race.SprintResults) ?? [];
      for (const r of results) {
        got += 1;
        if (r.Driver.code) {
          entry.rows.push({
            code: r.Driver.code,
            points: Number(r.points) || 0,
            constructorId: r.Constructor.constructorId,
          });
        }
      }
      byRound.set(round, entry);
    }

    const total = Number(data.MRData.total ?? 0);
    offset += got;
    if (got === 0 || offset >= total) break;
  }

  return byRound;
}

function addPoints(
  map: Map<string, Map<number, number>>,
  key: string,
  round: number,
  points: number,
) {
  const inner = map.get(key) ?? new Map<number, number>();
  inner.set(round, (inner.get(round) ?? 0) + points);
  map.set(key, inner);
}

/**
 * Season standings from Jolpica, enriched with driver photos / team colours and
 * a per-GP points matrix (race + sprint), keyed by round.
 */
export async function getStandings(): Promise<SeasonStandings> {
  const [driverData, constructorData, dbDrivers, raceByRound, sprintByRound] =
    await Promise.all([
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
      fetchAllRaces("results", "Results"),
      fetchAllRaces("sprint", "SprintResults"),
    ]);

  const colorByTeamId = new Map<string, string | null>();
  for (const d of dbDrivers) {
    if (d.team?.name) {
      colorByTeamId.set(teamNameToApiId(d.team.name), d.team.colorHex);
    }
  }

  // Per-GP matrices (race + sprint).
  const driverPerGp = new Map<string, Map<number, number>>();
  const ctorPerGp = new Map<string, Map<number, number>>();
  for (const byRound of [raceByRound, sprintByRound]) {
    for (const { round, rows } of byRound.values()) {
      for (const r of rows) {
        addPoints(driverPerGp, r.code.toUpperCase(), round, r.points);
        addPoints(ctorPerGp, r.constructorId, round, r.points);
      }
    }
  }

  const rounds: StandingsRound[] = [...raceByRound.values()]
    .sort((a, b) => a.round - b.round)
    .map((r) => ({
      round: r.round,
      name: r.name,
      countryIso: countryToIso(r.country),
    }));

  const toRecord = (m: Map<number, number> | undefined): Record<number, number> =>
    m ? Object.fromEntries(m) : {};

  const driverList =
    driverData?.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
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
      photoUrl: code ? `/drivers/${code.toUpperCase()}.webp` : null,
      perGp: toRecord(driverPerGp.get(code.toUpperCase())),
    };
  });

  const constructorList =
    constructorData?.MRData.StandingsTable.StandingsLists[0]
      ?.ConstructorStandings ?? [];
  const constructors: ConstructorStandingEntry[] = constructorList.map((row) => ({
    position: Number(row.position),
    points: Number(row.points),
    wins: Number(row.wins),
    name: row.Constructor.name,
    teamColor: colorByTeamId.get(teamNameToApiId(row.Constructor.name)) ?? null,
    perGp: toRecord(ctorPerGp.get(row.Constructor.constructorId)),
  }));

  return { drivers, constructors, rounds };
}
