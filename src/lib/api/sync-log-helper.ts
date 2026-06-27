import { createAdminClient } from "@/lib/supabase/admin";
import type { SyncSource, SyncStatus } from "@/types/sync-log";

export async function writeSyncLog(params: {
  source: SyncSource;
  endpoint: string;
  status: SyncStatus;
  message: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("sync_logs").insert({
      source: params.source,
      endpoint: params.endpoint,
      status: params.status,
      message: params.message,
    });
  } catch (error) {
    console.error("Failed to write sync_logs entry:", error);
  }
}
