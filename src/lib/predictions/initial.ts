import type { Prediction } from "@/types/prediction";

import type { PredictionKind } from "./deadline";
import { dnfSelectionFromPayload, type DnfSelection } from "./types";

export interface InitialFormState {
  mode: "podium" | "top10";
  slots: Record<string, string>;
  dnf: DnfSelection;
}

/** Derive initial prediction-form state from the user's saved predictions. */
export function deriveInitialFormState(
  predictions: Prediction[],
  kind: PredictionKind,
): InitialFormState {
  const podiumType = kind === "qualifying" ? "qualifying_podium" : "race_podium";
  const top10Type = kind === "qualifying" ? "qualifying_top10" : "race_top10";

  const top10 = predictions.find((p) => p.type === top10Type);
  const podium = predictions.find((p) => p.type === podiumType);
  const positionPred = top10 ?? podium;

  const dnfPred =
    kind === "race"
      ? predictions.find((p) => p.type === "race_dnf")
      : undefined;

  return {
    mode: top10 ? "top10" : "podium",
    slots: positionPred
      ? (positionPred.payload as Record<string, string>)
      : {},
    dnf: dnfPred ? dnfSelectionFromPayload(dnfPred.payload) : null,
  };
}
