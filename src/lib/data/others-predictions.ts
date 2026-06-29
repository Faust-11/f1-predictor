import { ACTIVE_SEASON_ID } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  mapPayloadRowToDomain,
  type PredictionRow,
} from "@/types/prediction";

export type PredictionSession = "race" | "qualifying";

export interface OtherPredictionRow {
  position: number;
  driverName: string;
  teamColor: string | null;
}

export interface OtherPrediction {
  userId: string;
  name: string;
  points: number;
  scored: boolean;
  positions: OtherPredictionRow[];
  /** Outsider team name (race only), or null. */
  dnf: string | null;
}

/**
 * All players' predictions for a race session (admin client — a public board
 * aggregates across users, who are otherwise RLS-scoped). Fully composed and
 * serializable. Excludes the current user (shown separately as "my prediction").
 */
export async function getOthersPredictions(
  raceId: string,
  session: PredictionSession,
  excludeUserId: string | null,
): Promise<OtherPrediction[]> {
  const admin = createAdminClient();

  const [predsRes, usersRes, driversRes, teamsRes] = await Promise.all([
    admin.from("predictions").select("*").eq("race_id", raceId),
    admin.from("users").select("id, display_name"),
    admin
      .from("drivers")
      .select("id, first_name, last_name, team_id")
      .eq("season_id", ACTIVE_SEASON_ID),
    admin
      .from("teams")
      .select("id, name, color_hex")
      .eq("season_id", ACTIVE_SEASON_ID),
  ]);

  for (const res of [predsRes, usersRes, driversRes, teamsRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const teamColor = new Map(
    (teamsRes.data ?? []).map((t) => [t.id, t.color_hex]),
  );
  const teamName = new Map((teamsRes.data ?? []).map((t) => [t.id, t.name]));
  const driverInfo = new Map(
    (driversRes.data ?? []).map((d) => [
      d.id,
      {
        name: `${d.first_name} ${d.last_name}`,
        teamColor: teamColor.get(d.team_id) ?? null,
      },
    ]),
  );
  const userName = new Map(
    (usersRes.data ?? []).map((u) => [u.id, u.display_name]),
  );

  const prefix = session === "qualifying" ? "qualifying" : "race";
  const rows = ((predsRes.data ?? []) as PredictionRow[]).filter(
    (p) => p.type.startsWith(prefix) && p.user_id !== excludeUserId,
  );

  const byUser = new Map<string, PredictionRow[]>();
  for (const row of rows) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  const result: OtherPrediction[] = [];
  for (const [userId, preds] of byUser) {
    // Position prediction: prefer the most complete (top10 over podium).
    const positionPred = preds
      .filter((p) => p.type.endsWith("podium") || p.type.endsWith("top10"))
      .sort(
        (a, b) =>
          Object.keys(b.payload as Record<string, string>).length -
          Object.keys(a.payload as Record<string, string>).length,
      )[0];

    const positions: OtherPredictionRow[] = [];
    if (positionPred) {
      const payload = positionPred.payload as Record<string, string>;
      const order = Object.keys(payload)
        .map(Number)
        .filter((n) => !Number.isNaN(n))
        .sort((a, b) => a - b);
      for (const pos of order) {
        const info = driverInfo.get(payload[String(pos)]);
        positions.push({
          position: pos,
          driverName: info?.name ?? "—",
          teamColor: info?.teamColor ?? null,
        });
      }
    }

    let dnf: string | null = null;
    const dnfPred = preds.find((p) => p.type === "race_dnf");
    if (dnfPred) {
      const payload = mapPayloadRowToDomain("race_dnf", dnfPred.payload);
      if ("teamIds" in payload && Array.isArray(payload.teamIds)) {
        const names = payload.teamIds
          .map((id) => teamName.get(id))
          .filter((n): n is string => Boolean(n));
        dnf = names.length ? names.join(", ") : null;
      }
    }

    const scored = preds.some((p) => p.points != null);
    const points = preds.reduce((sum, p) => sum + (p.points ?? 0), 0);

    result.push({
      userId,
      name: userName.get(userId) ?? "",
      points,
      scored,
      positions,
      dnf,
    });
  }

  result.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.name.localeCompare(b.name);
  });

  return result;
}

export interface PlayerRacePrediction {
  raceId: string;
  raceName: string;
  round: number;
  points: number;
  scored: boolean;
  positions: OtherPredictionRow[];
  dnf: string | null;
}

/**
 * Every player's race predictions, grouped by user then race (round desc).
 * Returned as a plain Record so it can be passed to a client component.
 * Used by the leaderboard to expand a player's card.
 */
export async function getPlayersPredictions(): Promise<
  Record<string, PlayerRacePrediction[]>
> {
  const admin = createAdminClient();

  const [predsRes, racesRes, driversRes, teamsRes] = await Promise.all([
    admin.from("predictions").select("*"),
    admin
      .from("races")
      .select("id, name, round")
      .eq("season_id", ACTIVE_SEASON_ID),
    admin
      .from("drivers")
      .select("id, first_name, last_name, team_id")
      .eq("season_id", ACTIVE_SEASON_ID),
    admin
      .from("teams")
      .select("id, name, color_hex")
      .eq("season_id", ACTIVE_SEASON_ID),
  ]);

  for (const res of [predsRes, racesRes, driversRes, teamsRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const teamColor = new Map(
    (teamsRes.data ?? []).map((t) => [t.id, t.color_hex]),
  );
  const teamName = new Map((teamsRes.data ?? []).map((t) => [t.id, t.name]));
  const driverInfo = new Map(
    (driversRes.data ?? []).map((d) => [
      d.id,
      {
        name: `${d.first_name} ${d.last_name}`,
        teamColor: teamColor.get(d.team_id) ?? null,
      },
    ]),
  );
  const raceInfo = new Map(
    (racesRes.data ?? []).map((r) => [r.id, { name: r.name, round: r.round }]),
  );

  // Group race_* predictions by user, then race.
  const byUserRace = new Map<string, Map<string, PredictionRow[]>>();
  for (const row of (predsRes.data ?? []) as PredictionRow[]) {
    if (!row.type.startsWith("race")) continue;
    const races = byUserRace.get(row.user_id) ?? new Map();
    const list = races.get(row.race_id) ?? [];
    list.push(row);
    races.set(row.race_id, list);
    byUserRace.set(row.user_id, races);
  }

  const out: Record<string, PlayerRacePrediction[]> = {};
  for (const [userId, races] of byUserRace) {
    const items: PlayerRacePrediction[] = [];
    for (const [raceId, preds] of races) {
      const positionPred = preds
        .filter((p) => p.type.endsWith("podium") || p.type.endsWith("top10"))
        .sort(
          (a, b) =>
            Object.keys(b.payload as Record<string, string>).length -
            Object.keys(a.payload as Record<string, string>).length,
        )[0];

      const positions: OtherPredictionRow[] = [];
      if (positionPred) {
        const payload = positionPred.payload as Record<string, string>;
        const order = Object.keys(payload)
          .map(Number)
          .filter((n) => !Number.isNaN(n))
          .sort((a, b) => a - b);
        for (const pos of order) {
          const info = driverInfo.get(payload[String(pos)]);
          positions.push({
            position: pos,
            driverName: info?.name ?? "—",
            teamColor: info?.teamColor ?? null,
          });
        }
      }

      let dnf: string | null = null;
      const dnfPred = preds.find((p) => p.type === "race_dnf");
      if (dnfPred) {
        const payload = mapPayloadRowToDomain("race_dnf", dnfPred.payload);
        if ("teamIds" in payload && Array.isArray(payload.teamIds)) {
          const names = payload.teamIds
            .map((id) => teamName.get(id))
            .filter((n): n is string => Boolean(n));
          dnf = names.length ? names.join(", ") : null;
        }
      }

      const info = raceInfo.get(raceId);
      items.push({
        raceId,
        raceName: info?.name ?? "—",
        round: info?.round ?? 0,
        points: preds.reduce((sum, p) => sum + (p.points ?? 0), 0),
        scored: preds.some((p) => p.points != null),
        positions,
        dnf,
      });
    }
    items.sort((a, b) => b.round - a.round);
    out[userId] = items;
  }

  return out;
}
