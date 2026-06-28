import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { getAllUserPredictions } from "@/lib/data/predictions";
import { getRaces } from "@/lib/data/races";
import { strings } from "@/lib/i18n/strings";
import type { Prediction } from "@/types/prediction";
import type { Race } from "@/types/race";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: strings.pages.history,
};

export default async function HistoryPage() {
  let predictions: Prediction[];
  let races: Race[];

  try {
    [predictions, races] = await Promise.all([
      getAllUserPredictions(),
      getRaces(),
    ]);
  } catch {
    return <ErrorState />;
  }

  if (predictions.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">
          {strings.history.title}
        </h1>
        <EmptyState
          message={strings.states.historyEmpty}
          icon={ClipboardList}
          action={{ label: strings.actions.goToCalendar, href: "/calendar" }}
        />
      </div>
    );
  }

  const raceMap = new Map(races.map((r) => [r.id, r]));

  // One card per race session: all race_* predictions (positions + DNF) merge
  // into a single "Гонка" card, qualifying_* into a single "Кваліфікація" card.
  type Session = "qualifying" | "race";
  interface Group {
    key: string;
    raceId: string;
    session: Session;
    round: number;
    name: string;
    completed: boolean;
    points: number;
    scored: boolean;
  }

  const groups = new Map<string, Group>();
  for (const prediction of predictions) {
    const race = raceMap.get(prediction.raceId);
    const session: Session = prediction.type.startsWith("qualifying")
      ? "qualifying"
      : "race";
    const key = `${prediction.raceId}__${session}`;

    const group = groups.get(key) ?? {
      key,
      raceId: prediction.raceId,
      session,
      round: race?.round ?? 0,
      name: race?.name ?? strings.race.driver,
      completed: race?.status === "completed",
      points: 0,
      scored: false,
    };

    if (prediction.points != null) {
      group.points += prediction.points;
      group.scored = true;
    }
    groups.set(key, group);
  }

  // Round desc; within a round qualifying before race.
  const sorted = [...groups.values()].sort((a, b) => {
    if (b.round !== a.round) return b.round - a.round;
    return a.session.localeCompare(b.session);
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">
        {strings.history.title}
      </h1>

      <ul className="flex flex-col gap-3">
        {sorted.map((group) => {
          const href =
            group.session === "qualifying"
              ? `/qualifying/${group.raceId}`
              : `/race/${group.raceId}`;
          const label =
            group.session === "qualifying"
              ? strings.pages.qualifying
              : strings.pages.race;

          return (
            <li key={group.key}>
              <Link href={href}>
                <Card className="transition-shadow duration-200 hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{group.name}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                    {group.completed && group.scored ? (
                      <span className="shrink-0 font-heading text-lg font-bold tabular-nums text-primary">
                        {group.points} {strings.results.pointsShort}
                      </span>
                    ) : (
                      <Badge variant="outline" className="shrink-0">
                        {strings.history.pending}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
