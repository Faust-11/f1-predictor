import { ACTIVE_SEASON_ID } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RaceStatus } from "@/types/race";
import type { SyncSource } from "@/types/sync-log";

import { fetchJolpicaCalendar, fetchJolpicaResults, fetchJolpicaRoster } from "./jolpica";
import {
  fetchOpenF1Calendar,
  fetchOpenF1Results,
  fetchOpenF1Roster,
  mapOpenF1ResultDriverIds,
} from "./openf1";
import type {
  ApiDriver,
  ApiRace,
  ApiTeam,
  CalendarPayload,
  RaceResultsPayload,
  RosterPayload,
  SyncJobResult,
  SyncScope,
} from "./normalized";
import { SEED_DRIVERS, SEED_TEAMS } from "./seed-data";
import { writeSyncLog } from "./sync-log-helper";
import { recalculateRacePoints } from "@/lib/scoring/recalculate";

const RESULTS_WINDOW_MS = 6 * 60 * 60 * 1000;

async function fetchCalendarWithFallback(): Promise<CalendarPayload> {
  try {
    return await fetchOpenF1Calendar();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OpenF1 error";
    await writeSyncLog({
      source: "openf1",
      endpoint: "meetings",
      status: "error",
      message,
    });
    return fetchJolpicaCalendar();
  }
}

async function fetchRosterWithFallback(): Promise<RosterPayload> {
  try {
    const roster = await fetchOpenF1Roster();
    if (roster.drivers.length >= 10) {
      return roster;
    }
    throw new Error("OpenF1 roster incomplete");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OpenF1 error";
    await writeSyncLog({
      source: "openf1",
      endpoint: "drivers",
      status: "error",
      message,
    });

    try {
      const roster = await fetchJolpicaRoster();
      if (roster.drivers.length >= 10) {
        return roster;
      }
    } catch (jolpicaError) {
      const jMessage =
        jolpicaError instanceof Error ? jolpicaError.message : "Unknown Jolpica error";
      await writeSyncLog({
        source: "jolpica",
        endpoint: "driverStandings",
        status: "error",
        message: jMessage,
      });
    }

    return {
      source: "openf1",
      teams: SEED_TEAMS.map((t) => ({
        apiTeamId: t.apiTeamId,
        name: t.name,
        colorHex: t.colorHex,
      })),
      drivers: SEED_DRIVERS.map((d) => ({
        apiDriverId: d.apiDriverId,
        apiTeamId: d.apiTeamId,
        firstName: d.firstName,
        lastName: d.lastName,
        code: d.code,
        number: d.number,
        country: d.country,
        photoUrl: null,
      })),
    };
  }
}

async function upsertTeams(teams: ApiTeam[]): Promise<number> {
  const admin = createAdminClient();
  let count = 0;

  for (const team of teams) {
    const { data: existing } = await admin
      .from("teams")
      .select("id")
      .eq("season_id", ACTIVE_SEASON_ID)
      .eq("api_team_id", team.apiTeamId)
      .maybeSingle();

    const row = {
      season_id: ACTIVE_SEASON_ID,
      name: team.name,
      color_hex: team.colorHex,
      api_team_id: team.apiTeamId,
    };

    if (existing) {
      const { error } = await admin.from("teams").update(row).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin.from("teams").insert(row);
      if (error) throw new Error(error.message);
    }
    count += 1;
  }

  return count;
}

async function getTeamIdMap(): Promise<Map<string, string>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("teams")
    .select("id, api_team_id")
    .eq("season_id", ACTIVE_SEASON_ID);

  if (error) throw new Error(error.message);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.api_team_id) {
      map.set(row.api_team_id, row.id);
    }
  }
  return map;
}

async function upsertDrivers(drivers: ApiDriver[]): Promise<number> {
  const admin = createAdminClient();
  const teamIds = await getTeamIdMap();
  let count = 0;

  for (const driver of drivers) {
    const teamId = teamIds.get(driver.apiTeamId);
    if (!teamId) continue;

    const { data: existing } = await admin
      .from("drivers")
      .select("id, photo_url")
      .eq("season_id", ACTIVE_SEASON_ID)
      .eq("api_driver_id", driver.apiDriverId)
      .maybeSingle();

    const row = {
      season_id: ACTIVE_SEASON_ID,
      team_id: teamId,
      first_name: driver.firstName,
      last_name: driver.lastName,
      code: driver.code,
      number: driver.number,
      // Keep the existing photo when the current source has none (e.g. the
      // Jolpica/seed fallback) — never overwrite a good photo with null.
      photo_url: driver.photoUrl ?? existing?.photo_url ?? null,
      country: driver.country,
      api_driver_id: driver.apiDriverId,
    };

    if (existing) {
      const { error } = await admin.from("drivers").update(row).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin.from("drivers").insert(row);
      if (error) throw new Error(error.message);
    }
    count += 1;
  }

  return count;
}

async function upsertRaces(races: ApiRace[], source: SyncSource): Promise<number> {
  const admin = createAdminClient();
  let count = 0;

  for (const race of races) {
    const { data: existing } = await admin
      .from("races")
      .select("id, status")
      .eq("season_id", ACTIVE_SEASON_ID)
      .eq("round", race.round)
      .maybeSingle();

    const preservedStatus: RaceStatus =
      existing?.status === "completed" ? "completed" : race.status;

    const row = {
      season_id: ACTIVE_SEASON_ID,
      round: race.round,
      name: race.name,
      country: race.country,
      circuit: race.circuit,
      qualifying_at_utc: race.qualifyingAtUtc,
      race_at_utc: race.raceAtUtc,
      status: preservedStatus,
      api_meeting_id: race.apiMeetingId,
    };

    if (existing) {
      const { error } = await admin.from("races").update(row).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin.from("races").insert(row);
      if (error) throw new Error(error.message);
    }
    count += 1;
  }

  await writeSyncLog({
    source,
    endpoint: "calendar",
    status: "success",
    message: `Synced ${count} races`,
  });

  return count;
}

async function getDriverLookup(): Promise<{
  byApiId: Map<string, string>;
  byNumber: Map<number, string>;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("drivers")
    .select("id, api_driver_id, number")
    .eq("season_id", ACTIVE_SEASON_ID);

  if (error) throw new Error(error.message);

  const byApiId = new Map<string, string>();
  const byNumber = new Map<number, string>();

  for (const row of data ?? []) {
    if (row.api_driver_id) byApiId.set(row.api_driver_id, row.id);
    if (row.number != null) byNumber.set(row.number, row.id);
  }

  return { byApiId, byNumber };
}

function resolveDriverId(
  lookup: { byApiId: Map<string, string>; byNumber: Map<number, string> },
  apiDriverId: string,
  driverNumber: number,
): string | undefined {
  return (
    lookup.byApiId.get(apiDriverId) ??
    (driverNumber ? lookup.byNumber.get(driverNumber) : undefined)
  );
}

async function persistResults(
  raceId: string,
  payload: RaceResultsPayload,
): Promise<{ qualifying: number; race: number }> {
  const admin = createAdminClient();
  const lookup = await getDriverLookup();

  let qualifyingCount = 0;
  let raceCount = 0;

  if (payload.qualifying.length > 0) {
    await admin.from("qualifying_results").delete().eq("race_id", raceId);
    for (const row of payload.qualifying) {
      const driverId = resolveDriverId(lookup, row.apiDriverId, row.driverNumber);
      if (!driverId) continue;
      const { error } = await admin.from("qualifying_results").insert({
        race_id: raceId,
        driver_id: driverId,
        position: row.position,
      });
      if (error) throw new Error(error.message);
      qualifyingCount += 1;
    }
  }

  if (payload.race.length > 0) {
    await admin.from("race_results").delete().eq("race_id", raceId);
    for (const row of payload.race) {
      const driverId = resolveDriverId(lookup, row.apiDriverId, row.driverNumber);
      if (!driverId) continue;
      const { error } = await admin.from("race_results").insert({
        race_id: raceId,
        driver_id: driverId,
        position: row.position,
        dnf: row.dnf,
      });
      if (error) throw new Error(error.message);
      raceCount += 1;
    }

    if (raceCount > 0) {
      await admin.from("races").update({ status: "completed" }).eq("id", raceId);
    }
  }

  return { qualifying: qualifyingCount, race: raceCount };
}

function isWithinResultsWindow(
  qualifyingAtUtc: string | null,
  raceAtUtc: string | null,
): boolean {
  const now = Date.now();
  for (const iso of [qualifyingAtUtc, raceAtUtc]) {
    if (!iso) continue;
    const t = new Date(iso).getTime();
    if (Math.abs(now - t) <= RESULTS_WINDOW_MS) return true;
  }
  return false;
}

async function syncCalendar(): Promise<SyncJobResult> {
  try {
    const payload = await fetchCalendarWithFallback();
    const count = await upsertRaces(payload.races, payload.source);
    return {
      scope: "calendar",
      success: true,
      message: `Calendar synced (${payload.source})`,
      details: { races: count },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calendar sync failed";
    await writeSyncLog({
      source: "openf1",
      endpoint: "calendar",
      status: "error",
      message,
    });
    return { scope: "calendar", success: false, message };
  }
}

async function syncRoster(): Promise<SyncJobResult> {
  try {
    const payload = await fetchRosterWithFallback();
    const teamsCount = await upsertTeams(payload.teams);
    const driversCount = await upsertDrivers(payload.drivers);

    await writeSyncLog({
      source: payload.source,
      endpoint: "roster",
      status: "success",
      message: `Synced ${teamsCount} teams, ${driversCount} drivers`,
    });

    return {
      scope: "roster",
      success: true,
      message: `Roster synced (${payload.source})`,
      details: { teams: teamsCount, drivers: driversCount },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Roster sync failed";
    await writeSyncLog({
      source: "jolpica",
      endpoint: "roster",
      status: "error",
      message,
    });
    return { scope: "roster", success: false, message };
  }
}

async function syncResults(): Promise<SyncJobResult> {
  const admin = createAdminClient();
  const { data: races, error } = await admin
    .from("races")
    .select("id, round, status, qualifying_at_utc, race_at_utc, api_meeting_id")
    .eq("season_id", ACTIVE_SEASON_ID);

  if (error) {
    return { scope: "results", success: false, message: error.message };
  }

  // Races that already have final race results — skip to avoid re-syncing.
  const { data: existingResults } = await admin
    .from("race_results")
    .select("race_id");
  const racesWithResults = new Set(
    (existingResults ?? []).map((r) => r.race_id),
  );

  const now = Date.now();
  let synced = 0;

  for (const race of races ?? []) {
    const hasResults = racesWithResults.has(race.id);

    // A completed race that already has results is final — leave it untouched.
    if (race.status === "completed" && hasResults) continue;

    const racePassed =
      race.race_at_utc != null && now > new Date(race.race_at_utc).getTime();

    const inWindow =
      race.status === "live" ||
      isWithinResultsWindow(race.qualifying_at_utc, race.race_at_utc) ||
      // Backfill: a race already in the past that has no results yet.
      (racePassed && !hasResults);

    if (!inWindow) continue;

    try {
      let payload: RaceResultsPayload;

      if (race.api_meeting_id) {
        payload = await fetchOpenF1Results(race.api_meeting_id, race.round);
        payload.qualifying = (await mapOpenF1ResultDriverIds(
          race.api_meeting_id,
          payload.qualifying,
        )) as RaceResultsPayload["qualifying"];
        payload.race = (await mapOpenF1ResultDriverIds(
          race.api_meeting_id,
          payload.race,
        )) as RaceResultsPayload["race"];
      } else {
        payload = await fetchJolpicaResults(ACTIVE_SEASON_ID, race.round);
      }

      if (payload.qualifying.length === 0 && payload.race.length === 0) {
        continue;
      }

      const counts = await persistResults(race.id, payload);
      synced += 1;

      // When race results land the race is marked completed — recalculate points.
      if (counts.race > 0) {
        const updated = await recalculateRacePoints(race.id);
        await writeSyncLog({
          source: payload.source,
          endpoint: `scoring/round/${race.round}`,
          status: "success",
          message: `Recalculated points for ${updated} prediction(s)`,
        });
      }

      await writeSyncLog({
        source: payload.source,
        endpoint: `results/round/${race.round}`,
        status: "success",
        message: `Qualifying: ${counts.qualifying}, Race: ${counts.race}`,
      });
    } catch (syncError) {
      const message =
        syncError instanceof Error ? syncError.message : "Results sync failed";
      await writeSyncLog({
        source: race.api_meeting_id ? "openf1" : "jolpica",
        endpoint: `results/round/${race.round}`,
        status: "error",
        message,
      });
    }
  }

  return {
    scope: "results",
    success: true,
    message: `Results synced for ${synced} race(s)`,
    details: { races: synced },
  };
}

export async function runSync(scope: SyncScope = "full"): Promise<SyncJobResult[]> {
  const results: SyncJobResult[] = [];

  if (scope === "calendar" || scope === "full") {
    results.push(await syncCalendar());
  }
  if (scope === "roster" || scope === "full") {
    results.push(await syncRoster());
  }
  if (scope === "results" || scope === "full") {
    results.push(await syncResults());
  }

  return results;
}
