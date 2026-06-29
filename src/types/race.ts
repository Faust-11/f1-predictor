export type RaceStatus = "upcoming" | "live" | "completed";

export interface Race {
  id: string;
  seasonId: number;
  round: number;
  name: string;
  country: string;
  circuit: string;
  qualifyingAtUtc: string;
  raceAtUtc: string;
  status: RaceStatus;
  highlightVideoId: string | null;
}

export interface RaceRow {
  id: string;
  season_id: number;
  round: number;
  name: string;
  country: string | null;
  circuit: string | null;
  qualifying_at_utc: string | null;
  race_at_utc: string | null;
  status: RaceStatus;
  api_meeting_id: string | null;
  highlight_video_id: string | null;
}

export function mapRaceRow(row: RaceRow): Race {
  return {
    id: row.id,
    seasonId: row.season_id,
    round: row.round,
    name: row.name,
    country: row.country ?? "",
    circuit: row.circuit ?? "",
    qualifyingAtUtc: row.qualifying_at_utc ?? "",
    raceAtUtc: row.race_at_utc ?? "",
    status: row.status,
    highlightVideoId: row.highlight_video_id ?? null,
  };
}
