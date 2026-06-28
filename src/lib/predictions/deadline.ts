import { PREDICTION_LOCK_MINUTES } from "@/lib/constants";
import type { PredictionType } from "@/types/prediction";
import type { Race } from "@/types/race";

export type PredictionKind = "qualifying" | "race";

const LOCK_MS = PREDICTION_LOCK_MINUTES * 60 * 1000;

/** The session whose start governs a prediction type's deadline. */
export function kindForType(type: PredictionType): PredictionKind {
  return type.startsWith("qualifying") ? "qualifying" : "race";
}

/** ISO start of the relevant session, or null if unknown. */
export function sessionStartIso(race: Race, kind: PredictionKind): string | null {
  const iso = kind === "qualifying" ? race.qualifyingAtUtc : race.raceAtUtc;
  return iso && iso.length > 0 ? iso : null;
}

/** Deadline = session start − 5 minutes. Null if session time unknown. */
export function getDeadline(race: Race, kind: PredictionKind): Date | null {
  const iso = sessionStartIso(race, kind);
  if (!iso) return null;
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return null;
  return new Date(start - LOCK_MS);
}

/**
 * Whether predictions for this session are locked.
 * Locked when now ≥ deadline. If the session time is unknown, treat as locked
 * (mirrors the server-side RLS check which returns false without a timestamp).
 */
export function isPredictionLocked(
  race: Race,
  kind: PredictionKind,
  now: number = Date.now(),
): boolean {
  const deadline = getDeadline(race, kind);
  if (!deadline) return true;
  return now >= deadline.getTime();
}
