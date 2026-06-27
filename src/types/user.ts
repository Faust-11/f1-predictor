export interface User {
  id: string;
  displayName: string | null;
  createdAt: string;
}

export interface UserRow {
  id: string;
  display_name: string | null;
  created_at: string;
}

export function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}
