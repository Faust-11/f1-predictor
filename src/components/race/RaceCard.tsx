import Link from "next/link";
import { CalendarDays, Flag, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrackOutline } from "@/components/race/TrackOutline";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { formatDateUk } from "@/lib/i18n/date";
import { strings } from "@/lib/i18n/strings";
import { isPredictionLocked } from "@/lib/predictions/deadline";
import { raceEntryHref } from "@/lib/predictions/routing";
import type { Race, RaceStatus } from "@/types/race";

function statusMeta(status: RaceStatus) {
  switch (status) {
    case "live":
      return { label: strings.race.live, variant: "live" as const };
    case "completed":
      return { label: strings.race.completed, variant: "completed" as const };
    default:
      return { label: strings.race.upcoming, variant: "upcoming" as const };
  }
}

function formatSession(iso: string): string {
  if (!iso) return "—";
  return formatDateUk(iso, "d MMM, HH:mm");
}

export function RaceCard({ race }: { race: Race }) {
  const status = statusMeta(race.status);
  const fullyLocked =
    race.status !== "completed" &&
    isPredictionLocked(race, "qualifying") &&
    isPredictionLocked(race, "race");

  const showResults = race.status === "completed";

  return (
    <Card className="flex flex-col transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="gap-2 pb-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {strings.race.round} {race.round}
          </span>
          <Badge variant={status.variant}>
            {race.status === "live" && (
              <span className="size-1.5 rounded-full bg-current" />
            )}
            {status.label}
          </Badge>
        </div>
        <TrackOutline
          src={`/tracks/${race.round}.svg`}
          className="mx-auto my-1 h-20 w-auto max-w-[70%] object-contain opacity-80 dark:invert"
        />
        <h3 className="font-heading text-lg font-bold leading-tight">
          {race.name}
        </h3>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-2 pt-0 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0" />
          <span>{[race.country, race.circuit].filter(Boolean).join(" · ") || "—"}</span>
        </p>
        <p className="flex items-center gap-2">
          <Flag className="size-4 shrink-0" />
          <span>
            {strings.race.qualifying}: {formatSession(race.qualifyingAtUtc)}
          </span>
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays className="size-4 shrink-0" />
          <span>
            {strings.race.raceDay}: {formatSession(race.raceAtUtc)}
          </span>
        </p>
      </CardContent>

      <CardFooter className="pt-0">
        {showResults ? (
          <Button
            render={<Link href={`/race/${race.id}`} />}
            variant="outline"
            size="lg"
            className="w-full"
          >
            {strings.actions.viewResults}
          </Button>
        ) : fullyLocked ? (
          <Button variant="secondary" size="lg" className="w-full" disabled>
            {strings.actions.predictionClosed}
          </Button>
        ) : (
          <Button
            render={<Link href={raceEntryHref(race)} />}
            size="lg"
            className="w-full"
          >
            {strings.actions.makePrediction}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
