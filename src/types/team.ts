export interface Team {
  id: string;
  seasonId: number;
  name: string;
  logoUrl: string | null;
  colorHex: string | null;
  apiTeamId: string | null;
}

export interface TeamRow {
  id: string;
  season_id: number;
  name: string;
  logo_url: string | null;
  color_hex: string | null;
  api_team_id: string | null;
}

export function mapTeamRow(row: TeamRow): Team {
  return {
    id: row.id,
    seasonId: row.season_id,
    name: row.name,
    logoUrl: row.logo_url,
    colorHex: row.color_hex,
    apiTeamId: row.api_team_id,
  };
}
