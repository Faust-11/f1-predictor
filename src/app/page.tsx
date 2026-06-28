import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";

import { Countdown } from "@/components/race/Countdown";
import { CalendarGrid } from "@/components/race/CalendarGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { getDriverMap } from "@/lib/data/drivers";
import {
  getLatestCompletedRace,
  getNextRace,
  getRaces,
} from "@/lib/data/races";
import { getRaceResults } from "@/lib/data/results";
import { formatDateUk } from "@/lib/i18n/date";
import { strings } from "@/lib/i18n/strings";
import { isPredictionLocked } from "@/lib/predictions/deadline";
import { raceEntryHref } from "@/lib/predictions/routing";
import type { Race } from "@/types/race";

export const dynamic = "force-dynamic";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 font-heading text-xl font-bold sm:text-2xl">{children}</h2>
  );
}

function nextSessionTarget(race: Race): { iso: string | null; label: string } {
  const qualiOpen =
    race.qualifyingAtUtc && !isPredictionLocked(race, "qualifying");
  if (qualiOpen) {
    return { iso: race.qualifyingAtUtc, label: strings.race.untilQualifying };
  }
  return { iso: race.raceAtUtc || null, label: strings.race.untilRace };
}

function NextRaceHero({ race }: { race: Race }) {
  const target = nextSessionTarget(race);
  return (
    <Card className="overflow-hidden border-primary/20">
      <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex flex-col gap-3">
          <Badge variant="primary" className="w-fit">
            {strings.race.nextRace}
          </Badge>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {strings.race.round} {race.round}
            </p>
            <h2 className="font-heading text-2xl font-bold sm:text-3xl">
              {race.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {[race.country, race.circuit].filter(Boolean).join(" · ")}
            </p>
          </div>
          {race.raceAtUtc && (
            <p className="text-sm text-muted-foreground">
              {strings.race.raceDay}:{" "}
              {formatDateUk(race.raceAtUtc, "d MMMM yyyy, HH:mm")}
            </p>
          )}
        </div>
        <div className="flex flex-col items-start gap-4 sm:items-end">
          <Countdown target={target.iso} label={target.label} />
          <Button render={<Link href={raceEntryHref(race)} />} size="lg">
            {strings.actions.makePrediction}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

async function LatestResults({ race }: { race: Race }) {
  const [results, driverMap] = await Promise.all([
    getRaceResults(race.id),
    getDriverMap(),
  ]);

  const podium = results
    .filter((r) => !r.dnf && r.position != null && r.position <= 3)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  if (podium.length === 0) {
    return <EmptyState message={strings.states.resultsEmpty} />;
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="font-medium">{race.name}</p>
          <Button
            render={<Link href={`/race/${race.id}`} />}
            variant="ghost"
            size="sm"
          >
            {strings.actions.viewResults}
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
        <ol className="flex flex-col gap-2">
          {podium.map((r) => {
            const driver = driverMap.get(r.driverId);
            return (
              <li
                key={r.driverId}
                className="flex items-center gap-3 rounded-md bg-secondary/60 px-3 py-2"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {r.position}
                </span>
                <span
                  className="h-5 w-1 rounded-full"
                  style={{
                    backgroundColor: driver?.team?.colorHex ?? "transparent",
                  }}
                />
                <span className="font-medium">
                  {driver
                    ? `${driver.firstName} ${driver.lastName}`
                    : strings.race.driver}
                </span>
                {driver?.team?.name && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {driver.team.name}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

export default async function Home() {
  let races: Race[];
  let nextRace: Race | null;
  let latestRace: Race | null;

  try {
    [races, nextRace, latestRace] = await Promise.all([
      getRaces(),
      getNextRace(),
      getLatestCompletedRace(),
    ]);
  } catch {
    return <ErrorState />;
  }

  const upcomingPreview = races
    .filter((r) => r.status !== "completed")
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-2">
        <Badge variant="outline" className="w-fit">
          {strings.app.seasonBanner}
        </Badge>
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          {strings.app.title}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{strings.app.tagline}</p>
      </section>

      <section>
        {nextRace ? (
          <NextRaceHero race={nextRace} />
        ) : (
          <EmptyState message={strings.race.noUpcoming} icon={Trophy} />
        )}
      </section>

      {latestRace && (
        <section>
          <SectionHeading>{strings.race.latestResults}</SectionHeading>
          <LatestResults race={latestRace} />
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold sm:text-2xl">
            {strings.race.seasonCalendar}
          </h2>
          <Button render={<Link href="/calendar" />} variant="ghost" size="sm">
            {strings.actions.goToCalendar}
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
        {upcomingPreview.length > 0 ? (
          <CalendarGrid races={upcomingPreview} />
        ) : (
          <EmptyState message={strings.states.calendarEmpty} />
        )}
      </section>
    </div>
  );
}
