import { createServerClient } from "@/lib/supabase/server";
import {
  mapQualifyingResultRow,
  mapRaceResultRow,
  type QualifyingResult,
  type RaceResult,
} from "@/types/result";

export async function getQualifyingResults(
  raceId: string,
): Promise<QualifyingResult[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("qualifying_results")
    .select("*")
    .eq("race_id", raceId)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapQualifyingResultRow);
}

/** Bulk-fetch results for several races (admin views). */
export async function getResultsForRaces(raceIds: string[]): Promise<{
  qualifying: Map<string, QualifyingResult[]>;
  race: Map<string, RaceResult[]>;
}> {
  const qualifying = new Map<string, QualifyingResult[]>();
  const race = new Map<string, RaceResult[]>();
  if (raceIds.length === 0) return { qualifying, race };

  const supabase = await createServerClient();
  const [qualiRes, raceRes] = await Promise.all([
    supabase.from("qualifying_results").select("*").in("race_id", raceIds),
    supabase.from("race_results").select("*").in("race_id", raceIds),
  ]);

  if (qualiRes.error) throw new Error(qualiRes.error.message);
  if (raceRes.error) throw new Error(raceRes.error.message);

  for (const row of qualiRes.data ?? []) {
    const list = qualifying.get(row.race_id) ?? [];
    list.push(mapQualifyingResultRow(row));
    qualifying.set(row.race_id, list);
  }
  for (const row of raceRes.data ?? []) {
    const list = race.get(row.race_id) ?? [];
    list.push(mapRaceResultRow(row));
    race.set(row.race_id, list);
  }

  return { qualifying, race };
}

export async function getRaceResults(raceId: string): Promise<RaceResult[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("race_results")
    .select("*")
    .eq("race_id", raceId)
    .order("position", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRaceResultRow);
}
