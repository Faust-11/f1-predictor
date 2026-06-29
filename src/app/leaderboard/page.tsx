import type { Metadata } from "next";
import { Trophy } from "lucide-react";

import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/data/leaderboard";
import {
  getPlayersPredictions,
  type PlayerRacePrediction,
} from "@/lib/data/others-predictions";
import { strings } from "@/lib/i18n/strings";
import { getServerUserId } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: strings.pages.leaderboard,
};

export default async function LeaderboardPage() {
  let entries: LeaderboardEntry[];
  let currentUserId: string | undefined;
  let predictionsByUser: Record<string, PlayerRacePrediction[]> = {};

  try {
    [entries, currentUserId, predictionsByUser] = await Promise.all([
      getLeaderboard(),
      getServerUserId(),
      getPlayersPredictions(),
    ]);
  } catch {
    return <ErrorState />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">
        {strings.leaderboard.title}
      </h1>
      {entries.length > 0 ? (
        <LeaderboardTable
          entries={entries}
          currentUserId={currentUserId}
          predictionsByUser={predictionsByUser}
        />
      ) : (
        <EmptyState message={strings.states.leaderboardEmpty} icon={Trophy} />
      )}
    </div>
  );
}
