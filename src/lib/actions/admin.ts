"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { runSync } from "@/lib/api/sync";
import type { SyncScope } from "@/lib/api/normalized";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { ADMIN_COOKIE, USER_ID_COOKIE_MAX_AGE } from "@/lib/constants";
import { recalculateRacePoints } from "@/lib/scoring/recalculate";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RaceStatus } from "@/types/race";

export type AdminResult = { ok: true; message?: string } | { ok: false; error: string };

export async function adminLogin(password: string): Promise<AdminResult> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return { ok: false, error: "ADMIN_PASSWORD не налаштовано." };
  }
  if (password !== expected) {
    return { ok: false, error: "Невірний пароль." };
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: ADMIN_COOKIE,
    value: password,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: USER_ID_COOKIE_MAX_AGE,
  });
  return { ok: true };
}

export async function adminLogout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  revalidatePath("/admin");
}

async function requireAdmin(): Promise<boolean> {
  return isAdminAuthenticated();
}

export async function runAdminSync(scope: SyncScope): Promise<AdminResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Немає доступу." };
  try {
    const results = await runSync(scope);
    const ok = results.every((r) => r.success);
    revalidatePath("/admin");
    return ok
      ? { ok: true, message: results.map((r) => r.message).join("; ") }
      : { ok: false, error: results.map((r) => r.message).join("; ") };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Sync failed" };
  }
}

export async function setRaceStatus(
  raceId: string,
  status: RaceStatus,
): Promise<AdminResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Немає доступу." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("races")
    .update({ status })
    .eq("id", raceId);
  if (error) return { ok: false, error: error.message };

  if (status === "completed") {
    await recalculateRacePoints(raceId);
  }
  revalidatePath("/admin");
  revalidatePath(`/race/${raceId}`);
  revalidatePath(`/qualifying/${raceId}`);
  revalidatePath("/leaderboard");
  return { ok: true };
}

export async function recalcRace(raceId: string): Promise<AdminResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Немає доступу." };
  try {
    const updated = await recalculateRacePoints(raceId);
    revalidatePath("/leaderboard");
    revalidatePath("/admin");
    return { ok: true, message: `Оновлено ${updated} прогнозів.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Recalc failed" };
  }
}

/** Accepts a full YouTube URL or a raw 11-char id; returns the id or null. */
function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export async function setHighlightVideo(
  raceId: string,
  input: string,
): Promise<AdminResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Немає доступу." };

  const id = parseYouTubeId(input);
  if (input.trim() && !id) {
    return { ok: false, error: "Невірне посилання YouTube." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("races")
    .update({ highlight_video_id: id })
    .eq("id", raceId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/race/${raceId}`);
  revalidatePath("/admin");
  return { ok: true, message: id ? "Відео збережено." : "Відео очищено." };
}

export interface ManualResultEntry {
  driverId: string;
  position: number | null;
  dnf?: boolean;
}

export async function saveManualResults(input: {
  raceId: string;
  kind: "qualifying" | "race";
  entries: ManualResultEntry[];
}): Promise<AdminResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Немає доступу." };
  const admin = createAdminClient();
  const table =
    input.kind === "qualifying" ? "qualifying_results" : "race_results";

  const { error: deleteError } = await admin
    .from(table)
    .delete()
    .eq("race_id", input.raceId);
  if (deleteError) return { ok: false, error: deleteError.message };

  if (input.kind === "qualifying") {
    const rows = input.entries
      .filter((e) => e.position != null)
      .map((e) => ({
        race_id: input.raceId,
        driver_id: e.driverId,
        position: e.position as number,
      }));
    if (rows.length > 0) {
      const { error } = await admin.from("qualifying_results").insert(rows);
      if (error) return { ok: false, error: error.message };
    }
  } else {
    const rows = input.entries
      .filter((e) => e.position != null || e.dnf)
      .map((e) => ({
        race_id: input.raceId,
        driver_id: e.driverId,
        position: e.dnf ? null : e.position,
        dnf: Boolean(e.dnf),
      }));
    if (rows.length > 0) {
      const { error } = await admin.from("race_results").insert(rows);
      if (error) return { ok: false, error: error.message };
    }
  }

  await recalculateRacePoints(input.raceId);
  revalidatePath("/admin");
  revalidatePath(`/race/${input.raceId}`);
  revalidatePath(`/qualifying/${input.raceId}`);
  revalidatePath("/leaderboard");
  return { ok: true, message: "Результати збережено." };
}
