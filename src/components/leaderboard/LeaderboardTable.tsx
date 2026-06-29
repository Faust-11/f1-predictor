"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";

import type { LeaderboardEntry } from "@/lib/data/leaderboard";
import type { PlayerRacePrediction } from "@/lib/data/others-predictions";
import { strings } from "@/lib/i18n/strings";
import { cn } from "@/lib/utils";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  predictionsByUser: Record<string, PlayerRacePrediction[]>;
}

function PredictionDetails({ races }: { races: PlayerRacePrediction[] }) {
  if (races.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {strings.leaderboard.noPredictions}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {races.map((race) => (
        <div
          key={race.raceId}
          className="rounded-md border border-border/60 bg-background p-3"
        >
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold">
              {race.raceName}
            </span>
            {race.scored && (
              <span className="shrink-0 font-heading text-sm font-bold tabular-nums text-primary">
                {race.points} {strings.results.pointsShort}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {race.positions.map((p) => (
              <div key={p.position} className="flex items-center gap-2 text-sm">
                <span className="w-5 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                  {p.position}
                </span>
                <span
                  className="h-3.5 w-1 shrink-0 rounded-full bg-border"
                  style={
                    p.teamColor ? { backgroundColor: p.teamColor } : undefined
                  }
                />
                <span className="truncate">{p.driverName}</span>
              </div>
            ))}
          </div>
          {race.dnf && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {strings.share.dnf}: {race.dnf}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function LeaderboardTable({
  entries,
  currentUserId,
  predictionsByUser,
}: LeaderboardTableProps) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(userId: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2.5 font-medium">{strings.leaderboard.rank}</th>
            <th className="px-3 py-2.5 font-medium">{strings.leaderboard.name}</th>
            <th className="px-3 py-2.5 text-right font-medium">
              {strings.leaderboard.points}
            </th>
            <th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">
              {strings.leaderboard.races}
            </th>
            <th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">
              {strings.leaderboard.exact}
            </th>
            <th className="hidden px-3 py-2.5 text-right font-medium md:table-cell">
              {strings.leaderboard.accuracy}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const isCurrent = entry.userId === currentUserId;
            const isOpen = open.has(entry.userId);
            return (
              <Fragment key={entry.userId}>
                <tr
                  onClick={() => toggle(entry.userId)}
                  className={cn(
                    "cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/40",
                    isCurrent && "bg-primary/5",
                    isOpen && "bg-secondary/40",
                  )}
                >
                  <td className="px-3 py-2.5 font-semibold tabular-nums">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <ChevronDown
                        className={cn(
                          "size-3.5 text-muted-foreground transition-transform",
                          isOpen && "rotate-180",
                        )}
                      />
                      <span className="font-medium">
                        {entry.displayName || strings.leaderboard.anonymous}
                      </span>
                      {isCurrent && (
                        <span className="rounded-sm bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                          {strings.leaderboard.you}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-heading font-bold tabular-nums text-primary">
                    {entry.points}
                  </td>
                  <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                    {entry.races}
                  </td>
                  <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                    {entry.exactHits}
                  </td>
                  <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground md:table-cell">
                    {Math.round(entry.accuracy * 100)}%
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-border/60 last:border-0">
                    <td colSpan={6} className="bg-secondary/20 px-3 py-3">
                      <PredictionDetails
                        races={predictionsByUser[entry.userId] ?? []}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
