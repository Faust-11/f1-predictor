export interface Driver {
  id: string;
  seasonId: number;
  teamId: string;
  firstName: string;
  lastName: string;
  code: string;
  number: number | null;
  photoUrl: string | null;
  country: string | null;
}

export interface DriverRow {
  id: string;
  season_id: number;
  team_id: string;
  first_name: string;
  last_name: string;
  code: string;
  number: number | null;
  photo_url: string | null;
  country: string | null;
  api_driver_id: string | null;
}

export function mapDriverRow(row: DriverRow): Driver {
  return {
    id: row.id,
    seasonId: row.season_id,
    teamId: row.team_id,
    firstName: row.first_name,
    lastName: row.last_name,
    code: row.code,
    number: row.number,
    photoUrl: row.photo_url,
    country: row.country,
  };
}
