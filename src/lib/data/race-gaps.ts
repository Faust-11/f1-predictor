import { ACTIVE_SEASON_ID } from "@/lib/constants";
import type { DriverWithTeam } from "@/lib/data/drivers";
import type { Race } from "@/types/race";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";
// Past results never change — cache for an hour.
const REVALIDATE_SECONDS = 3600;

interface JolpicaScheduleRace {
  round: string;
  raceName: string;
  date: string;
}

interface JolpicaResultRow {
  position: string;
  Driver: { permanentNumber?: string };
  Time?: { time?: string };
}

async function fetchJolpica<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}/${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Our `round` is sourced from OpenF1, whose round ordering can differ from
 * Jolpica's — so match by race date (fallback: name) instead of by round.
 */
async function resolveJolpicaRound(race: Race): Promise<number | null> {
  const data = await fetchJolpica<{
    MRData: { RaceTable: { Races: JolpicaScheduleRace[] } };
  }>(`${ACTIVE_SEASON_ID}.json?limit=100`);

  const races = data?.MRData.RaceTable.Races ?? [];
  if (races.length === 0) return null;

  const raceDate = race.raceAtUtc ? race.raceAtUtc.slice(0, 10) : null;
  const target =
    (raceDate ? races.find((r) => r.date === raceDate) : undefined) ??
    races.find((r) => r.raceName === race.name);

  return target ? Number(target.round) : null;
}

/**
 * Finishing gaps for a race, keyed by our driver id.
 * Winner → total time (e.g. "1:23:06.801"); others → "+2.974". From Jolpica.
 * Returns an empty map on any failure so the page degrades gracefully.
 */
export async function getRaceGaps(
  race: Race,
  drivers: DriverWithTeam[],
): Promise<Map<string, string>> {
  const gaps = new Map<string, string>();

  const round = await resolveJolpicaRound(race);
  if (round == null) return gaps;

  const data = await fetchJolpica<{
    MRData: { RaceTable: { Races: Array<{ Results?: JolpicaResultRow[] }> } };
  }>(`${ACTIVE_SEASON_ID}/${round}/results.json`);

  const rows = data?.MRData.RaceTable.Races?.[0]?.Results ?? [];
  if (rows.length === 0) return gaps;

  const idByNumber = new Map<number, string>();
  for (const d of drivers) {
    if (d.number != null) idByNumber.set(d.number, d.id);
  }

  for (const row of rows) {
    const time = row.Time?.time;
    const num = row.Driver.permanentNumber
      ? Number(row.Driver.permanentNumber)
      : null;
    if (!time || num == null) continue;
    const driverId = idByNumber.get(num);
    if (driverId) gaps.set(driverId, time);
  }

  return gaps;
}
