import { createAdminClient } from "@/lib/supabase/admin";
import { mapSyncLogRow, type SyncLog } from "@/types/sync-log";

/** Latest sync log entries (admin/service-role only). */
export async function getSyncLogs(limit = 50): Promise<SyncLog[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sync_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapSyncLogRow);
}
