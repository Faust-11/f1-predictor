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

  // Sort by race round desc, then by type.
  const sorted = [...predictions].sort((a, b) => {
    const roundA = raceMap.get(a.raceId)?.round ?? 0;
    const roundB = raceMap.get(b.raceId)?.round ?? 0;
    if (roundB !== roundA) return roundB - roundA;
    return a.type.localeCompare(b.type);
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">
        {strings.history.title}
      </h1>

      <ul className="flex flex-col gap-3">
        {sorted.map((prediction) => {
          const race = raceMap.get(prediction.raceId);
          const completed = race?.status === "completed";
          const href =
            prediction.type.startsWith("qualifying") && race
              ? `/qualifying/${race.id}`
              : `/race/${prediction.raceId}`;

          return (
            <li key={prediction.id}>
              <Link href={href}>
                <Card className="transition-shadow duration-200 hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {race?.name ?? strings.race.driver}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {strings.history.type[prediction.type]}
                      </p>
                    </div>
                    {completed && prediction.points != null ? (
                      <span className="shrink-0 font-heading text-lg font-bold tabular-nums text-primary">
                        {prediction.points} {strings.results.pointsShort}
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
