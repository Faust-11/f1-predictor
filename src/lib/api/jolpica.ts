import { ACTIVE_SEASON_ID } from "@/lib/constants";

import { fetchJson } from "./fetch-json";
import type {
  ApiDriver,
  ApiQualifyingResult,
  ApiRace,
  ApiRaceResult,
  ApiTeam,
  CalendarPayload,
  RaceResultsPayload,
  RosterPayload,
} from "./normalized";
import { driverToApiId } from "./team-slug";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";

interface JolpicaRace {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Qualifying?: { date: string; time: string };
  Circuit: {
    circuitName: string;
    Location: { country: string; locality: string };
  };
}

interface JolpicaConstructor {
  constructorId: string;
  name: string;
}

interface JolpicaDriverStanding {
  Driver: {
    driverId: string;
    code?: string;
    givenName: string;
    familyName: string;
    permanentNumber?: string;
    nationality: string;
  };
  Constructors: JolpicaConstructor[];
}

interface JolpicaQualifyingResult {
  position: string;
  Driver: { driverId: string; permanentNumber?: string };
}

interface JolpicaRaceResultRow {
  position: string;
  positionText: string;
  Driver: { driverId: string; permanentNumber?: string };
  status: string;
}

function toUtcIso(date: string, time?: string): string | null {
  if (!date) return null;
  const iso = time ? `${date}T${time}` : `${date}T00:00:00Z`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function inferRaceStatus(
  qualifyingAtUtc: string | null,
  raceAtUtc: string | null,
): ApiRace["status"] {
  const now = Date.now();
  const windowMs = 6 * 60 * 60 * 1000;

  for (const iso of [raceAtUtc, qualifyingAtUtc]) {
    if (!iso) continue;
    const start = new Date(iso).getTime();
    if (now >= start - 30 * 60 * 1000 && now <= start + windowMs) {
      return "live";
    }
  }

  if (raceAtUtc && now > new Date(raceAtUtc).getTime() + windowMs) {
    return "completed";
  }

  return "upcoming";
}

async function fetchAllJolpicaRaces(seasonId: number): Promise<JolpicaRace[]> {
  const limit = 30;
  let offset = 0;
  const races: JolpicaRace[] = [];

  while (true) {
    const payload = await fetchJson<{
      MRData: {
        total: string;
        RaceTable: { Races: JolpicaRace[] };
      };
    }>(`${BASE_URL}/${seasonId}.json?limit=${limit}&offset=${offset}`);

    const batch = payload.MRData.RaceTable?.Races ?? [];
    races.push(...batch);

    const total = Number(payload.MRData.total);
    offset += batch.length;
    if (offset >= total || batch.length === 0) {
      break;
    }
  }

  return races;
}

export async function fetchJolpicaCalendar(
  seasonId: number = ACTIVE_SEASON_ID,
): Promise<CalendarPayload> {
  const jolpicaRaces = await fetchAllJolpicaRaces(seasonId);

  const races: ApiRace[] = jolpicaRaces.map((race) => {
    const qualifyingAtUtc = race.Qualifying
      ? toUtcIso(race.Qualifying.date, race.Qualifying.time)
      : null;
    const raceAtUtc = toUtcIso(race.date, race.time);

    return {
      seasonId,
      round: Number(race.round),
      name: race.raceName,
      country: race.Circuit.Location.country,
      circuit: race.Circuit.circuitName,
      qualifyingAtUtc,
      raceAtUtc,
      apiMeetingId: null,
      status: inferRaceStatus(qualifyingAtUtc, raceAtUtc),
    };
  });

  return { source: "jolpica", races };
}

export async function fetchJolpicaRoster(
  seasonId: number = ACTIVE_SEASON_ID,
): Promise<RosterPayload> {
  const [constructorsPayload, standingsPayload] = await Promise.all([
    fetchJson<{
      MRData: { ConstructorTable: { Constructors: JolpicaConstructor[] } };
    }>(`${BASE_URL}/${seasonId}/constructors.json?limit=30`),
    fetchJson<{
      MRData: {
        StandingsTable: {
          StandingsLists: Array<{ DriverStandings: JolpicaDriverStanding[] }>;
        };
      };
    }>(`${BASE_URL}/${seasonId}/driverStandings.json?limit=30`),
  ]);

  const teams: ApiTeam[] = (
    constructorsPayload.MRData.ConstructorTable?.Constructors ?? []
  ).map((c) => ({
    apiTeamId: c.constructorId,
    name: c.name,
    colorHex: null,
  }));

  const standings =
    standingsPayload.MRData.StandingsTable?.StandingsLists?.[0]
      ?.DriverStandings ?? [];

  const drivers: ApiDriver[] = standings
    .filter((row) => row.Driver.code)
    .map((row) => ({
      apiDriverId: row.Driver.driverId,
      apiTeamId: row.Constructors[0]?.constructorId ?? "unknown",
      firstName: row.Driver.givenName,
      lastName: row.Driver.familyName,
      code: row.Driver.code ?? "UNK",
      number: row.Driver.permanentNumber
        ? Number(row.Driver.permanentNumber)
        : null,
      country: row.Driver.nationality,
      photoUrl: null,
    }));

  return { source: "jolpica", teams, drivers };
}

export async function fetchJolpicaResults(
  seasonId: number,
  round: number,
): Promise<RaceResultsPayload> {
  const [qualiPayload, racePayload] = await Promise.all([
    fetchJson<{
      MRData: {
        RaceTable: { Races: Array<{ QualifyingResults: JolpicaQualifyingResult[] }> };
      };
    }>(`${BASE_URL}/${seasonId}/${round}/qualifying.json`).catch(() => null),
    fetchJson<{
      MRData: {
        RaceTable: { Races: Array<{ Results: JolpicaRaceResultRow[] }> };
      };
    }>(`${BASE_URL}/${seasonId}/${round}/results.json`).catch(() => null),
  ]);

  const qualifying: ApiQualifyingResult[] = [];
  const race: ApiRaceResult[] = [];

  const qualiRows =
    qualiPayload?.MRData.RaceTable?.Races?.[0]?.QualifyingResults ?? [];
  for (const row of qualiRows) {
    qualifying.push({
      apiDriverId: row.Driver.driverId,
      driverNumber: row.Driver.permanentNumber
        ? Number(row.Driver.permanentNumber)
        : 0,
      position: Number(row.position),
    });
  }

  const raceRows = racePayload?.MRData.RaceTable?.Races?.[0]?.Results ?? [];
  for (const row of raceRows) {
    const posText = row.positionText;
    const dnf = posText === "R" || posText === "D" || posText === "W";
    race.push({
      apiDriverId: row.Driver.driverId,
      driverNumber: row.Driver.permanentNumber
        ? Number(row.Driver.permanentNumber)
        : 0,
      position: dnf ? null : Number(row.position),
      dnf,
    });
  }

  return { source: "jolpica", round, qualifying, race };
}

/** Normalize Jolpica driver id when OpenF1 slug differs — keep jolpica id as canonical in DB. */
export function jolpicaDriverIdFromName(
  firstName: string,
  lastName: string,
): string {
  return driverToApiId(firstName, lastName);
}
