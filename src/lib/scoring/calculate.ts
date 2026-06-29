import {
  type Prediction,
  type PredictionType,
} from "@/types/prediction";
import type { QualifyingResult, RaceResult } from "@/types/result";

/** Points per exactly-correct slot (TZ.md §14). */
export const POSITION_POINTS: Record<number, number> = {
  1: 10,
  2: 8,
  3: 6,
};
const LOWER_SLOT_POINTS = 3; // P4–P10
export const PODIUM_BONUS = 10;
export const TOP10_BONUS = 30;
export const DNF_BONUS = 10;

const PODIUM_SLOT_NUMBERS = [1, 2, 3];
const TOP10_SLOT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function pointsForSlot(slot: number): number {
  return POSITION_POINTS[slot] ?? LOWER_SLOT_POINTS;
}

function slotsForType(type: PredictionType): number[] {
  if (type === "qualifying_podium" || type === "race_podium") {
    return PODIUM_SLOT_NUMBERS;
  }
  return TOP10_SLOT_NUMBERS;
}

export interface ScoreBreakdown {
  base: number;
  podiumBonus: number;
  top10Bonus: number;
  dnfBonus: number;
  total: number;
  correctSlots: number;
  totalSlots: number;
  /** All predicted slots matched (perfect prediction). */
  isPerfect: boolean;
  /** P1–P3 all correct (used for leaderboard tie-break). */
  isExactPodium: boolean;
}

const EMPTY_BREAKDOWN: ScoreBreakdown = {
  base: 0,
  podiumBonus: 0,
  top10Bonus: 0,
  dnfBonus: 0,
  total: 0,
  correctSlots: 0,
  totalSlots: 0,
  isPerfect: false,
  isExactPodium: false,
};

/** Build position→driverId map from qualifying results. */
export function qualifyingPositionMap(
  results: QualifyingResult[],
): Map<number, string> {
  return new Map(results.map((r) => [r.position, r.driverId]));
}

/** Build finishing position→driverId map (excludes DNF / no position). */
export function racePositionMap(results: RaceResult[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const r of results) {
    if (!r.dnf && r.position != null) {
      map.set(r.position, r.driverId);
    }
  }
  return map;
}

function scorePosition(
  type: PredictionType,
  predicted: Record<string, string>,
  actual: Map<number, string>,
  driverKey: Map<string, string>,
): ScoreBreakdown {
  const slots = slotsForType(type);
  let base = 0;
  let correctSlots = 0;

  // Compare by canonical driver key (code), not raw id — duplicate driver rows
  // can give a prediction and the result different ids for the same driver.
  const keyOf = (id: string | undefined): string | null =>
    id ? driverKey.get(id) || id : null;
  const slotMatches = (slot: number): boolean => {
    const predictedKey = keyOf(predicted[String(slot)]);
    return predictedKey != null && predictedKey === keyOf(actual.get(slot));
  };

  for (const slot of slots) {
    if (slotMatches(slot)) {
      base += pointsForSlot(slot);
      correctSlots += 1;
    }
  }

  const podiumCorrect = PODIUM_SLOT_NUMBERS.every((slot) => slotMatches(slot));
  const isExactPodium = podiumCorrect;

  // Podium bonus applies whenever P1–P3 are all correct (podium or top10 type).
  const podiumBonus = podiumCorrect ? PODIUM_BONUS : 0;

  const isTop10Type = slots.length === TOP10_SLOT_NUMBERS.length;
  const allCorrect = correctSlots === slots.length;
  const top10Bonus = isTop10Type && allCorrect ? TOP10_BONUS : 0;

  return {
    base,
    podiumBonus,
    top10Bonus,
    dnfBonus: 0,
    total: base + podiumBonus + top10Bonus,
    correctSlots,
    totalSlots: slots.length,
    isPerfect: allCorrect,
    isExactPodium,
  };
}

function scoreDnf(
  payload: Prediction["payload"],
  raceResults: RaceResult[],
  driverTeam: Map<string, string>,
): ScoreBreakdown {
  const anyDnf = raceResults.some((r) => r.dnf);

  let hit = false;
  if ("allFinish" in payload && payload.allFinish) {
    hit = !anyDnf;
  } else if ("teamId" in payload) {
    hit = raceResults.some(
      (r) => r.dnf && driverTeam.get(r.driverId) === payload.teamId,
    );
  }

  const dnfBonus = hit ? DNF_BONUS : 0;
  return {
    ...EMPTY_BREAKDOWN,
    dnfBonus,
    total: dnfBonus,
    totalSlots: 1,
    isPerfect: hit,
  };
}

export interface ScoringContext {
  qualifyingByPosition: Map<number, string>;
  raceByPosition: Map<number, string>;
  raceResults: RaceResult[];
  /** driverId → teamId, for DNF scoring. */
  driverTeam: Map<string, string>;
  /** driverId → canonical key (code), so duplicate driver rows still match. */
  driverKey: Map<string, string>;
}

/** Score a single prediction against official results. Pure function. */
export function scorePrediction(
  prediction: Pick<Prediction, "type" | "payload">,
  ctx: ScoringContext,
): ScoreBreakdown {
  const { type, payload } = prediction;

  if (type === "race_dnf") {
    return scoreDnf(payload, ctx.raceResults, ctx.driverTeam);
  }

  const actual =
    type === "qualifying_podium" || type === "qualifying_top10"
      ? ctx.qualifyingByPosition
      : ctx.raceByPosition;

  return scorePosition(
    type,
    payload as Record<string, string>,
    actual,
    ctx.driverKey,
  );
}
