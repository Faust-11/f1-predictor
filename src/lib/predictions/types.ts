import type { PredictionPayload } from "@/types/prediction";

/** Mutually-exclusive DNF choice in the race form. */
export type DnfSelection =
  | { kind: "team"; teamId: string }
  | { kind: "all" }
  | null;

export function dnfSelectionToPayload(selection: DnfSelection): PredictionPayload | null {
  if (!selection) return null;
  if (selection.kind === "all") return { allFinish: true };
  return { teamId: selection.teamId };
}

export function dnfSelectionFromPayload(
  payload: PredictionPayload | undefined,
): DnfSelection {
  if (!payload) return null;
  if ("allFinish" in payload && payload.allFinish) return { kind: "all" };
  if ("teamId" in payload) return { kind: "team", teamId: payload.teamId };
  return null;
}
