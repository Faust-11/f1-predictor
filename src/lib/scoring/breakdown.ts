import type { BreakdownItem } from "@/components/results/PointsBreakdown";
import { strings } from "@/lib/i18n/strings";
import type { Prediction } from "@/types/prediction";

import { scorePrediction, type ScoringContext } from "./calculate";

/** Per-prediction labelled points lines for the results page. */
export function buildBreakdownItems(
  predictions: Prediction[],
  ctx: ScoringContext,
): { items: BreakdownItem[]; total: number } {
  const items: BreakdownItem[] = [];
  let total = 0;

  for (const prediction of predictions) {
    const breakdown = scorePrediction(prediction, ctx);
    total += breakdown.total;
    items.push({
      label: strings.history.type[prediction.type],
      points: breakdown.total,
    });
  }

  return { items, total };
}
