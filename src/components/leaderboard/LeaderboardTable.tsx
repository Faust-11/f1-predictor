import type { LeaderboardEntry } from "@/lib/data/leaderboard";
import { strings } from "@/lib/i18n/strings";
import { cn } from "@/lib/utils";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export function LeaderboardTable({
  entries,
  currentUserId,
}: LeaderboardTableProps) {
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
            return (
              <tr
                key={entry.userId}
                className={cn(
                  "border-b border-border/60 last:border-0",
                  isCurrent && "bg-primary/5",
                )}
              >
                <td className="px-3 py-2.5 font-semibold tabular-nums">
                  {index + 1}
                </td>
                <td className="px-3 py-2.5">
                  <span className="font-medium">
                    {entry.displayName || strings.leaderboard.anonymous}
                  </span>
                  {isCurrent && (
                    <span className="ml-2 rounded-sm bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                      {strings.leaderboard.you}
                    </span>
                  )}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
