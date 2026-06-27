export interface QualifyingResult {
  raceId: string;
  driverId: string;
  position: number;
}

export interface QualifyingResultRow {
  race_id: string;
  driver_id: string;
  position: number;
}

export interface RaceResult {
  raceId: string;
  driverId: string;
  position: number | null;
  dnf: boolean;
}

export interface RaceResultRow {
  race_id: string;
  driver_id: string;
  position: number | null;
  dnf: boolean;
}

export function mapQualifyingResultRow(
  row: QualifyingResultRow,
): QualifyingResult {
  return {
    raceId: row.race_id,
    driverId: row.driver_id,
    position: row.position,
  };
}

export function mapRaceResultRow(row: RaceResultRow): RaceResult {
  return {
    raceId: row.race_id,
    driverId: row.driver_id,
    position: row.position,
    dnf: row.dnf,
  };
}
