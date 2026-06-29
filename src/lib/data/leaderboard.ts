import { ACTIVE_SEASON_ID } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { scorePrediction } from "@/lib/scoring/calculate";
import { buildScoringContext } from "@/lib/scoring/context";
import {
  mapPayloadRowToDomain,
  type PredictionRow,
} from "@/types/prediction";
import { mapQualifyingResultRow, mapRaceResultRow } from "@/types/result";

export interface LeaderboardEntry {
  userId: string;
  displayName: string | null;
  points: number;
  races: number;
  exactHits: number;
  /** Perfect podium predictions — tie-break metric (TZ §12). */
  exactPodiums: number;
  /** Share of correctly predicted position slots, 0..1. */
  accuracy: number;
  createdAt: string;
}

interface Aggregate {
  points: number;
  races: Set<string>;
  exactHits: number;
  exactPodiums: number;
  correctSlots: number;
  totalSlots: number;
}

/**
 * Cross-user ranking for completed races. Uses the service-role client because
 * a public leaderboard inherently aggregates across all users (RLS scopes
 * predictions/users to the current anonymous id). Read-only, server-only.
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const admin = createAdminClient();

  const { data: races, error: racesError } = await admin
    .from("races")
    .select("id")
    .eq("season_id", ACTIVE_SEASON_ID)
    .eq("status", "completed");

  if (racesError) throw new Error(racesError.message);
  const raceIds = (races ?? []).map((r) => r.id);
  if (raceIds.length === 0) return [];

  const [qualiRes, raceRes, driversRes, predictionsRes, usersRes] =
    await Promise.all([
      admin.from("qualifying_results").select("*").in("race_id", raceIds),
      admin.from("race_results").select("*").in("race_id", raceIds),
      admin
        .from("drivers")
        .select("id, team_id, code")
        .eq("season_id", ACTIVE_SEASON_ID),
      admin.from("predictions").select("*").in("race_id", raceIds),
      admin.from("users").select("id, display_name, created_at"),
    ]);

  for (const res of [qualiRes, raceRes, driversRes, predictionsRes, usersRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const driverTeam = new Map<string, string>(
    (driversRes.data ?? []).map((d) => [d.id, d.team_id]),
  );
  const driverKey = new Map<string, string>(
    (driversRes.data ?? []).map((d) => [d.id, d.code]),
  );

  // Per-race scoring context.
  const contextByRace = new Map(
    raceIds.map((raceId) => {
      const quali = (qualiRes.data ?? [])
        .filter((r) => r.race_id === raceId)
        .map(mapQualifyingResultRow);
      const race = (raceRes.data ?? [])
        .filter((r) => r.race_id === raceId)
        .map(mapRaceResultRow);
      return [
        raceId,
        buildScoringContext(quali, race, driverTeam, driverKey),
      ];
    }),
  );

  const aggregates = new Map<string, Aggregate>();
  for (const row of (predictionsRes.data ?? []) as PredictionRow[]) {
    const ctx = contextByRace.get(row.race_id);
    if (!ctx) continue;

    const breakdown = scorePrediction(
      { type: row.type, payload: mapPayloadRowToDomain(row.type, row.payload) },
      ctx,
    );

    let agg = aggregates.get(row.user_id);
    if (!agg) {
      agg = {
        points: 0,
        races: new Set(),
        exactHits: 0,
        exactPodiums: 0,
        correctSlots: 0,
        totalSlots: 0,
      };
      aggregates.set(row.user_id, agg);
    }

    agg.points += breakdown.total;
    agg.races.add(row.race_id);

    if (row.type !== "race_dnf") {
      agg.correctSlots += breakdown.correctSlots;
      agg.totalSlots += breakdown.totalSlots;
      if (breakdown.isPerfect) agg.exactHits += 1;
    }
    if (
      (row.type === "qualifying_podium" || row.type === "race_podium") &&
      breakdown.isPerfect
    ) {
      agg.exactPodiums += 1;
    }
  }

  const userMeta = new Map(
    (usersRes.data ?? []).map((u) => [
      u.id,
      { displayName: u.display_name, createdAt: u.created_at },
    ]),
  );

  const entries: LeaderboardEntry[] = [...aggregates.entries()].map(
    ([userId, agg]) => {
      const meta = userMeta.get(userId);
      return {
        userId,
        displayName: meta?.displayName ?? null,
        points: agg.points,
        races: agg.races.size,
        exactHits: agg.exactHits,
        exactPodiums: agg.exactPodiums,
        accuracy: agg.totalSlots > 0 ? agg.correctSlots / agg.totalSlots : 0,
        createdAt: meta?.createdAt ?? new Date(0).toISOString(),
      };
    },
  );

  // Sort: points desc → exact podiums desc → earlier registration first.
  entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.exactPodiums !== a.exactPodiums) return b.exactPodiums - a.exactPodiums;
    return a.createdAt.localeCompare(b.createdAt);
  });

  return entries;
}
