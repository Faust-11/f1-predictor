import { ACTIVE_SEASON_ID } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { mapRaceRow, type Race } from "@/types/race";

/** All races for the active season, ordered by round. */
export async function getRaces(): Promise<Race[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("races")
    .select("*")
    .eq("season_id", ACTIVE_SEASON_ID)
    .order("round", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRaceRow);
}

export async function getRaceById(id: string): Promise<Race | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("races")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRaceRow(data) : null;
}

/** Nearest non-completed race (rounds are chronological). Falls back to last race. */
export async function getNextRace(): Promise<Race | null> {
  const races = await getRaces();
  if (races.length === 0) return null;

  const next = races.find((r) => r.status !== "completed");
  return next ?? races[races.length - 1];
}

/** Most recently completed race (highest round with status completed). */
export async function getLatestCompletedRace(): Promise<Race | null> {
  const races = await getRaces();
  const completed = races.filter((r) => r.status === "completed");
  if (completed.length === 0) return null;
  return completed[completed.length - 1];
}
