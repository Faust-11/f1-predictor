import type { RaceStatus } from "@/types/race";
import type { SyncSource } from "@/types/sync-log";

export type SyncScope = "calendar" | "roster" | "results" | "full";

export interface ApiRace {
  seasonId: number;
  round: number;
  name: string;
  country: string;
  circuit: string;
  qualifyingAtUtc: string | null;
  raceAtUtc: string | null;
  sprintQualifyingAtUtc: string | null;
  sprintAtUtc: string | null;
  apiMeetingId: string | null;
  status: RaceStatus;
}

export interface ApiTeam {
  apiTeamId: string;
  name: string;
  colorHex: string | null;
}

export interface ApiDriver {
  apiDriverId: string;
  apiTeamId: string;
  firstName: string;
  lastName: string;
  code: string;
  number: number | null;
  country: string | null;
  photoUrl: string | null;
}

export interface ApiQualifyingResult {
  apiDriverId: string;
  driverNumber: number;
  position: number;
}

export interface ApiRaceResult {
  apiDriverId: string;
  driverNumber: number;
  position: number | null;
  dnf: boolean;
}

export interface CalendarPayload {
  source: SyncSource;
  races: ApiRace[];
}

export interface RosterPayload {
  source: SyncSource;
  teams: ApiTeam[];
  drivers: ApiDriver[];
}

export interface RaceResultsPayload {
  source: SyncSource;
  round: number;
  qualifying: ApiQualifyingResult[];
  race: ApiRaceResult[];
}

export interface SyncJobResult {
  scope: SyncScope;
  success: boolean;
  message: string;
  details?: Record<string, number>;
}
