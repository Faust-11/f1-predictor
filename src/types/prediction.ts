export type PredictionType =
  | "qualifying_podium"
  | "qualifying_top10"
  | "race_podium"
  | "race_top10"
  | "race_dnf";

/** Position slots: { "1": driver_id, "2": driver_id, ... } */
export type PositionPayload = Record<string, string>;

export type DnfTeamPayload = { teamIds: string[] };
export type DnfAllFinishPayload = { allFinish: true };

export type PredictionPayload =
  | PositionPayload
  | DnfTeamPayload
  | DnfAllFinishPayload;

/** JSONB shape stored in Postgres (snake_case keys for DNF) */
export type DnfTeamPayloadRow = { team_ids: string[] } | { team_id: string };
export type DnfAllFinishPayloadRow = { all_finish: true };

export type PredictionPayloadRow =
  | PositionPayload
  | DnfTeamPayloadRow
  | DnfAllFinishPayloadRow;

export interface Prediction {
  id: string;
  userId: string;
  raceId: string;
  type: PredictionType;
  payload: PredictionPayload;
  points: number | null;
}

export interface PredictionRow {
  id: string;
  user_id: string;
  race_id: string;
  type: PredictionType;
  payload: PredictionPayloadRow;
  points: number | null;
  created_at: string;
  updated_at: string;
}

export function mapPayloadRowToDomain(
  type: PredictionType,
  payload: PredictionPayloadRow,
): PredictionPayload {
  if (type === "race_dnf") {
    if ("all_finish" in payload && payload.all_finish) {
      return { allFinish: true };
    }
    if ("team_ids" in payload && Array.isArray(payload.team_ids)) {
      return { teamIds: payload.team_ids };
    }
    // Backward compatibility with the old single-team shape.
    if ("team_id" in payload && typeof payload.team_id === "string") {
      return { teamIds: [payload.team_id] };
    }
  }
  return payload as PositionPayload;
}

export function mapPayloadDomainToRow(
  type: PredictionType,
  payload: PredictionPayload,
): PredictionPayloadRow {
  if (type === "race_dnf") {
    if ("allFinish" in payload && payload.allFinish) {
      return { all_finish: true };
    }
    if ("teamIds" in payload && Array.isArray(payload.teamIds)) {
      return { team_ids: payload.teamIds };
    }
  }
  return payload as PositionPayload;
}

export function mapPredictionRow(row: PredictionRow): Prediction {
  return {
    id: row.id,
    userId: row.user_id,
    raceId: row.race_id,
    type: row.type,
    payload: mapPayloadRowToDomain(row.type, row.payload),
    points: row.points,
  };
}

export function isPositionPrediction(type: PredictionType): boolean {
  return type !== "race_dnf";
}

export function isDnfPrediction(type: PredictionType): type is "race_dnf" {
  return type === "race_dnf";
}
