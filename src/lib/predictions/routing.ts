import type { Race } from "@/types/race";

import { isPredictionLocked } from "./deadline";

/**
 * Where the primary CTA on a race card should lead:
 * - completed → race page (results view)
 * - qualifying still open → qualifying prediction
 * - otherwise → race page (race prediction / results)
 */
export function raceEntryHref(race: Race, now: number = Date.now()): string {
  if (race.status === "completed") {
    return `/race/${race.id}`;
  }
  if (!isPredictionLocked(race, "qualifying", now)) {
    return `/qualifying/${race.id}`;
  }
  return `/race/${race.id}`;
}
