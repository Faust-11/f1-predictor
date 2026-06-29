import type { PredictionPayload } from "@/types/prediction";

/** DNF choice in the race form: several teams OR "everyone finishes". */
export type DnfSelection =
  | { kind: "teams"; teamIds: string[] }
  | { kind: "all" }
  | null;

export function dnfSelectionToPayload(
  selection: DnfSelection,
): PredictionPayload | null {
  if (!selection) return null;
  if (selection.kind === "all") return { allFinish: true };
  if (selection.teamIds.length === 0) return null;
  return { teamIds: selection.teamIds };
}

export function dnfSelectionFromPayload(
  payload: PredictionPayload | undefined,
): DnfSelection {
  if (!payload) return null;
  if ("allFinish" in payload && payload.allFinish) return { kind: "all" };
  if ("teamIds" in payload && Array.isArray(payload.teamIds)) {
    return { kind: "teams", teamIds: payload.teamIds };
  }
  return null;
}
