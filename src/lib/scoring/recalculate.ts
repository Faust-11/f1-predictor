import { ACTIVE_SEASON_ID } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  mapPayloadRowToDomain,
  type PredictionRow,
} from "@/types/prediction";
import { mapQualifyingResultRow, mapRaceResultRow } from "@/types/result";

import { scorePrediction } from "./calculate";
import { buildScoringContext } from "./context";

/**
 * Recompute and persist points for every prediction on a race.
 * Runs with the service-role client (bypasses RLS) — server/cron/admin only.
 * Returns the number of predictions updated.
 */
export async function recalculateRacePoints(raceId: string): Promise<number> {
  const admin = createAdminClient();

  const [qualiRes, raceRes, driversRes, predictionsRes] = await Promise.all([
    admin.from("qualifying_results").select("*").eq("race_id", raceId),
    admin.from("race_results").select("*").eq("race_id", raceId),
    admin
      .from("drivers")
      .select("id, team_id, code")
      .eq("season_id", ACTIVE_SEASON_ID),
    admin.from("predictions").select("*").eq("race_id", raceId),
  ]);

  if (qualiRes.error) throw new Error(qualiRes.error.message);
  if (raceRes.error) throw new Error(raceRes.error.message);
  if (driversRes.error) throw new Error(driversRes.error.message);
  if (predictionsRes.error) throw new Error(predictionsRes.error.message);

  const qualifying = (qualiRes.data ?? []).map(mapQualifyingResultRow);
  const race = (raceRes.data ?? []).map(mapRaceResultRow);
  const driverTeam = new Map<string, string>(
    (driversRes.data ?? []).map((d) => [d.id, d.team_id]),
  );
  const driverKey = new Map<string, string>(
    (driversRes.data ?? []).map((d) => [d.id, d.code]),
  );

  const ctx = buildScoringContext(qualifying, race, driverTeam, driverKey);

  let updated = 0;
  for (const row of (predictionsRes.data ?? []) as PredictionRow[]) {
    const breakdown = scorePrediction(
      { type: row.type, payload: mapPayloadRowToDomain(row.type, row.payload) },
      ctx,
    );

    if (row.points === breakdown.total) continue;

    const { error } = await admin
      .from("predictions")
      .update({ points: breakdown.total })
      .eq("id", row.id);

    if (error) throw new Error(error.message);
    updated += 1;
  }

  return updated;
}
