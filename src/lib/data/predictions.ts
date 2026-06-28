import { createServerClient } from "@/lib/supabase/server";
import { getServerUserId } from "@/lib/supabase/server";
import {
  mapPredictionRow,
  type Prediction,
  type PredictionRow,
  type PredictionType,
} from "@/types/prediction";

/** Current user's predictions for a single race (RLS scopes to own rows). */
export async function getUserPredictionsForRace(
  raceId: string,
): Promise<Prediction[]> {
  const userId = await getServerUserId();
  if (!userId) return [];

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .eq("race_id", raceId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PredictionRow[]).map(mapPredictionRow);
}

export async function getUserPrediction(
  raceId: string,
  type: PredictionType,
): Promise<Prediction | null> {
  const predictions = await getUserPredictionsForRace(raceId);
  return predictions.find((p) => p.type === type) ?? null;
}

/** All of the current user's predictions (for history page). */
export async function getAllUserPredictions(): Promise<Prediction[]> {
  const userId = await getServerUserId();
  if (!userId) return [];

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PredictionRow[]).map(mapPredictionRow);
}
