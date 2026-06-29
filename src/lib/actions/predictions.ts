"use server";

import { revalidatePath } from "next/cache";

import { ensureUserExists } from "@/lib/identity";
import { strings } from "@/lib/i18n/strings";
import { PODIUM_SLOTS, TOP10_SLOTS } from "@/lib/constants";
import { createServerClient, getServerUserId } from "@/lib/supabase/server";
import {
  mapPayloadDomainToRow,
  type PredictionPayload,
  type PredictionType,
} from "@/types/prediction";

export interface SavePredictionInput {
  raceId: string;
  type: PredictionType;
  payload: PredictionPayload;
  displayName?: string;
}

export type SaveResult = { ok: true } | { ok: false; error: string };

function validatePayload(
  type: PredictionType,
  payload: PredictionPayload,
): boolean {
  if (type === "race_dnf") {
    if ("allFinish" in payload) return payload.allFinish === true;
    if ("teamIds" in payload) return payload.teamIds.length > 0;
    return false;
  }

  const required =
    type === "qualifying_podium" || type === "race_podium"
      ? PODIUM_SLOTS
      : TOP10_SLOTS;

  const record = payload as Record<string, string>;
  for (let slot = 1; slot <= required; slot++) {
    if (!record[String(slot)]) return false;
  }
  return true;
}

export async function savePrediction(
  input: SavePredictionInput,
): Promise<SaveResult> {
  const userId = await getServerUserId();
  if (!userId) {
    return { ok: false, error: strings.predictions.saveFailed };
  }

  if (!validatePayload(input.type, input.payload)) {
    return { ok: false, error: strings.predictions.fillAllSlots };
  }

  try {
    await ensureUserExists(userId);

    const supabase = await createServerClient();

    const trimmedName = input.displayName?.trim();
    if (trimmedName) {
      const { error: nameError } = await supabase
        .from("users")
        .update({ display_name: trimmedName })
        .eq("id", userId);
      if (nameError) {
        return { ok: false, error: strings.predictions.saveFailed };
      }
    }

    const { error } = await supabase.from("predictions").upsert(
      {
        user_id: userId,
        race_id: input.raceId,
        type: input.type,
        payload: mapPayloadDomainToRow(input.type, input.payload),
      },
      { onConflict: "user_id,race_id,type" },
    );

    if (error) {
      // RLS rejects writes after the deadline.
      return { ok: false, error: strings.predictions.deadlinePassed };
    }

    revalidatePath(`/qualifying/${input.raceId}`);
    revalidatePath(`/race/${input.raceId}`);
    revalidatePath("/history");
    return { ok: true };
  } catch {
    return { ok: false, error: strings.predictions.saveFailed };
  }
}
