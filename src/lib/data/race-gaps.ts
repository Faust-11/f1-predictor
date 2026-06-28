import { ACTIVE_SEASON_ID } from "@/lib/constants";
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
  Driver: { code?: string; permanentNumber?: string };
  Time?: { time?: string };
}

interface JolpicaQualifyingRow {
  position: string;
  Driver: { code?: string };
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

/** "1:04.567" -> 64.567; "58.123" -> 58.123. */
function lapToSeconds(t: string | undefined): number | null {
  if (!t || !t.trim()) return null;
  const parts = t.trim().split(":");
  const secs =
    parts.length === 2
      ? Number(parts[0]) * 60 + Number(parts[1])
      : Number(parts[0]);
  return Number.isFinite(secs) ? secs : null;
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
 * Finishing gaps for a race, keyed by driver CODE (e.g. "HAM").
 * Winner → total time (e.g. "1:23:06.801"); others → "+2.974". From Jolpica.
 * Keyed by code (not our driver id) so it is immune to duplicate/again-synced
 * driver rows. Returns an empty map on any failure so the page degrades gracefully.
 */
export async function getRaceGaps(race: Race): Promise<Map<string, string>> {
  const gaps = new Map<string, string>();

  const round = await resolveJolpicaRound(race);
  if (round == null) return gaps;

  const data = await fetchJolpica<{
    MRData: { RaceTable: { Races: Array<{ Results?: JolpicaResultRow[] }> } };
  }>(`${ACTIVE_SEASON_ID}/${round}/results.json`);

  const rows = data?.MRData.RaceTable.Races?.[0]?.Results ?? [];
  if (rows.length === 0) return gaps;

  for (const row of rows) {
    const time = row.Time?.time;
    const code = row.Driver.code?.toUpperCase();
    if (!time || !code) continue; // no code, or retired / DNS (no finishing gap)
    gaps.set(code, time);
  }

  return gaps;
}

/**
 * Qualifying gaps keyed by driver CODE. Pole → best lap time (e.g. "1:04.567");
 * others → gap to pole ("+0.123"). From Jolpica qualifying results.
 */
export async function getQualifyingGaps(
  race: Race,
): Promise<Map<string, string>> {
  const gaps = new Map<string, string>();
  const round = await resolveJolpicaRound(race);
  if (round == null) return gaps;

  const data = await fetchJolpica<{
    MRData: {
      RaceTable: { Races: Array<{ QualifyingResults?: JolpicaQualifyingRow[] }> };
    };
  }>(`${ACTIVE_SEASON_ID}/${round}/qualifying.json`);

  const rows = data?.MRData.RaceTable.Races?.[0]?.QualifyingResults ?? [];
  if (rows.length === 0) return gaps;

  const entries = rows
    .map((r) => {
      const code = r.Driver.code?.toUpperCase();
      const times = [r.Q1, r.Q2, r.Q3]
        .map(lapToSeconds)
        .filter((n): n is number => n != null);
      const best = times.length ? Math.min(...times) : null;
      const raw = [r.Q3, r.Q2, r.Q1].find((t) => lapToSeconds(t) === best);
      return code && best != null ? { code, best, raw } : null;
    })
    .filter(
      (e): e is { code: string; best: number; raw: string | undefined } =>
        e != null,
    );

  if (entries.length === 0) return gaps;
  const pole = Math.min(...entries.map((e) => e.best));

  for (const e of entries) {
    const diff = e.best - pole;
    gaps.set(e.code, diff < 0.0005 ? e.raw ?? "" : `+${diff.toFixed(3)}`);
  }

  return gaps;
}
