"use server";

import { revalidatePath } from "next/cache";

import { ensureUserExists } from "@/lib/identity";
import { strings } from "@/lib/i18n/strings";
import { createServerClient, getServerUserId } from "@/lib/supabase/server";

export type ProfileResult = { ok: true } | { ok: false; error: string };

export async function updateDisplayName(name: string): Promise<ProfileResult> {
  const userId = await getServerUserId();
  if (!userId) {
    return { ok: false, error: strings.profile.saveFailed };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: strings.predictions.nameRequired };
  }

  try {
    await ensureUserExists(userId);
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("users")
      .update({ display_name: trimmed })
      .eq("id", userId);

    if (error) {
      return { ok: false, error: strings.profile.saveFailed };
    }

    revalidatePath("/profile");
    revalidatePath("/leaderboard");
    return { ok: true };
  } catch {
    return { ok: false, error: strings.profile.saveFailed };
  }
}
