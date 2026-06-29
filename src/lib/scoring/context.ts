import type { QualifyingResult, RaceResult } from "@/types/result";

import {
  qualifyingPositionMap,
  racePositionMap,
  type ScoringContext,
} from "./calculate";

/** Assemble a ScoringContext from already-fetched results and a driver→team map. */
export function buildScoringContext(
  qualifying: QualifyingResult[],
  race: RaceResult[],
  driverTeam: Map<string, string>,
  driverKey: Map<string, string> = new Map(),
): ScoringContext {
  return {
    qualifyingByPosition: qualifyingPositionMap(qualifying),
    raceByPosition: racePositionMap(race),
    raceResults: race,
    driverTeam,
    driverKey,
  };
}
