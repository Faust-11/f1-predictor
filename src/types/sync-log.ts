export type SyncSource = "openf1" | "jolpica";

export type SyncStatus = "success" | "error";

export interface SyncLog {
  id: string;
  source: SyncSource;
  endpoint: string | null;
  status: SyncStatus;
  message: string | null;
  createdAt: string;
}

export interface SyncLogRow {
  id: string;
  source: SyncSource;
  endpoint: string | null;
  status: SyncStatus;
  message: string | null;
  created_at: string;
}

export function mapSyncLogRow(row: SyncLogRow): SyncLog {
  return {
    id: row.id,
    source: row.source,
    endpoint: row.endpoint,
    status: row.status,
    message: row.message,
    createdAt: row.created_at,
  };
}
