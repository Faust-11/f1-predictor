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
import {
  driverToApiId,
  normalizeHexColor,
  teamNameToApiId,
} from "./team-slug";

const BASE_URL = "https://api.openf1.org/v1";

interface OpenF1Meeting {
  meeting_key: number;
  meeting_name: string;
  country_name: string;
  circuit_short_name: string;
  date_start: string;
  year: number;
  is_cancelled: boolean;
}

interface OpenF1Session {
  session_key: number;
  meeting_key: number;
  session_type: string;
  session_name: string;
  date_start: string;
}

interface OpenF1Driver {
  meeting_key: number;
  driver_number: number;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  first_name: string;
  last_name: string;
  headshot_url: string | null;
  country_code: string | null;
}

interface OpenF1SessionResult {
  driver_number: number;
  position: number;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
}

function isGrandPrixMeeting(meeting: OpenF1Meeting): boolean {
  return (
    !meeting.is_cancelled &&
    meeting.meeting_name.includes("Grand Prix") &&
    !meeting.meeting_name.toLowerCase().includes("testing")
  );
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

async function fetchSessions(meetingKey: number): Promise<OpenF1Session[]> {
  return fetchJson<OpenF1Session[]>(
    `${BASE_URL}/sessions?meeting_key=${meetingKey}`,
  );
}

export async function fetchOpenF1Calendar(
  seasonId: number = ACTIVE_SEASON_ID,
): Promise<CalendarPayload> {
  const meetings = await fetchJson<OpenF1Meeting[]>(
    `${BASE_URL}/meetings?year=${seasonId}`,
  );

  const grandPrixMeetings = meetings
    .filter(isGrandPrixMeeting)
    .sort(
      (a, b) =>
        new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
    );

  const races: ApiRace[] = [];

  for (const [index, meeting] of grandPrixMeetings.entries()) {
    const sessions = await fetchSessions(meeting.meeting_key);
    const qualifying = sessions.find((s) => s.session_type === "Qualifying");
    const race = sessions.find((s) => s.session_type === "Race");

    const qualifyingAtUtc = qualifying?.date_start ?? null;
    const raceAtUtc = race?.date_start ?? null;

    races.push({
      seasonId,
      round: index + 1,
      name: meeting.meeting_name,
      country: meeting.country_name,
      circuit: meeting.circuit_short_name,
      qualifyingAtUtc,
      raceAtUtc,
      apiMeetingId: String(meeting.meeting_key),
      status: inferRaceStatus(qualifyingAtUtc, raceAtUtc),
    });
  }

  return { source: "openf1", races };
}

function dedupeOpenF1Drivers(drivers: OpenF1Driver[]): OpenF1Driver[] {
  const byNumber = new Map<number, OpenF1Driver>();
  for (const driver of drivers) {
    byNumber.set(driver.driver_number, driver);
  }
  return [...byNumber.values()];
}

export async function fetchOpenF1Roster(
  seasonId: number = ACTIVE_SEASON_ID,
): Promise<RosterPayload> {
  const meetings = await fetchJson<OpenF1Meeting[]>(
    `${BASE_URL}/meetings?year=${seasonId}`,
  );

  // Use the latest GP that has already happened — the season's last meeting is
  // a future race whose entries carry placeholder photos and tentative line-ups.
  const grandPrix = meetings.filter(isGrandPrixMeeting);
  const now = Date.now();
  const latestGp =
    grandPrix
      .filter((m) => new Date(m.date_start).getTime() <= now)
      .sort(
        (a, b) =>
          new Date(b.date_start).getTime() - new Date(a.date_start).getTime(),
      )[0] ??
    grandPrix.sort(
      (a, b) =>
        new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
    )[0];

  if (!latestGp) {
    return { source: "openf1", teams: [], drivers: [] };
  }

  const rawDrivers = await fetchJson<OpenF1Driver[]>(
    `${BASE_URL}/drivers?meeting_key=${latestGp.meeting_key}`,
  );

  const drivers: ApiDriver[] = [];
  const teamsMap = new Map<string, ApiTeam>();

  for (const row of dedupeOpenF1Drivers(rawDrivers)) {
    const apiTeamId = teamNameToApiId(row.team_name);
    teamsMap.set(apiTeamId, {
      apiTeamId,
      name: row.team_name,
      colorHex: normalizeHexColor(row.team_colour),
    });

    drivers.push({
      apiDriverId: driverToApiId(
        row.first_name,
        row.last_name,
        row.name_acronym,
      ),
      apiTeamId,
      firstName: row.first_name,
      lastName: row.last_name,
      code: row.name_acronym,
      number: row.driver_number,
      country: row.country_code,
      // OpenF1 now serves a placeholder ("fallback") image for many entries —
      // treat that as "no photo" so it never overwrites a real stored photo.
      photoUrl:
        row.headshot_url && !row.headshot_url.includes("fallback")
          ? row.headshot_url
          : null,
    });
  }

  return {
    source: "openf1",
    teams: [...teamsMap.values()],
    drivers,
  };
}

export async function fetchOpenF1Results(
  meetingKey: string,
  round: number,
): Promise<RaceResultsPayload> {
  const sessions = await fetchSessions(Number(meetingKey));
  const qualifyingSession = sessions.find((s) => s.session_type === "Qualifying");
  const raceSession = sessions.find((s) => s.session_type === "Race");

  const qualifying: ApiQualifyingResult[] = [];
  const race: ApiRaceResult[] = [];

  if (qualifyingSession) {
    const rows = await fetchJson<OpenF1SessionResult[]>(
      `${BASE_URL}/session_result?session_key=${qualifyingSession.session_key}`,
    );
    for (const row of rows) {
      if (row.dsq || row.dns) continue;
      qualifying.push({
        apiDriverId: `driver_${row.driver_number}`,
        driverNumber: row.driver_number,
        position: row.position,
      });
    }
  }

  if (raceSession) {
    const rows = await fetchJson<OpenF1SessionResult[]>(
      `${BASE_URL}/session_result?session_key=${raceSession.session_key}`,
    );
    for (const row of rows) {
      if (row.dsq) continue;
      race.push({
        apiDriverId: `driver_${row.driver_number}`,
        driverNumber: row.driver_number,
        position: row.dnf || row.dns ? null : row.position,
        dnf: row.dnf || row.dns,
      });
    }
  }

  return { source: "openf1", round, qualifying, race };
}

export async function fetchOpenF1DriversForMeeting(
  meetingKey: string,
): Promise<OpenF1Driver[]> {
  const drivers = await fetchJson<OpenF1Driver[]>(
    `${BASE_URL}/drivers?meeting_key=${meetingKey}`,
  );
  return dedupeOpenF1Drivers(drivers);
}

/** Resolve session_result driver_number to api_driver_id using meeting roster. */
export async function mapOpenF1ResultDriverIds(
  meetingKey: string,
  results: ApiQualifyingResult[] | ApiRaceResult[],
): Promise<(ApiQualifyingResult | ApiRaceResult)[]> {
  const roster = await fetchOpenF1DriversForMeeting(meetingKey);
  const byNumber = new Map(
    roster.map((d) => [
      d.driver_number,
      driverToApiId(d.first_name, d.last_name, d.name_acronym),
    ]),
  );

  return results.map((row) => ({
    ...row,
    apiDriverId: byNumber.get(row.driverNumber) ?? row.apiDriverId,
  }));
}
