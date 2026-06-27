export interface Season {
  id: number;
  label: string;
  isActive: boolean;
}

export interface SeasonRow {
  id: number;
  label: string;
  is_active: boolean;
}

export function mapSeasonRow(row: SeasonRow): Season {
  return {
    id: row.id,
    label: row.label,
    isActive: row.is_active,
  };
}
