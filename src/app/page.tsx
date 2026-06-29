import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";

import { Countdown } from "@/components/race/Countdown";
import { CalendarGrid } from "@/components/race/CalendarGrid";
import { TrackOutline } from "@/components/race/TrackOutline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
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
import { getStandings } from "@/lib/data/standings";
import { getNews } from "@/lib/data/news";
import { countryToIso, flagUrl } from "@/lib/country-flag";
import { StandingsCard } from "@/components/leaderboard/StandingsCard";
import { NewsCard } from "@/components/leaderboard/NewsCard";
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
  const iso = countryToIso(race.country);
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
            <div className="flex items-center gap-2">
              {iso && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={flagUrl(iso)}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  width={24}
                  height={24}
                  className="size-6 shrink-0 rounded-full"
                />
              )}
              <h2 className="font-heading text-2xl font-bold sm:text-3xl">
                {race.name}
              </h2>
            </div>
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
        <TrackOutline
          src={`/tracks/${race.round}.svg`}
          className="mx-auto h-24 w-auto max-w-[45%] shrink-0 opacity-80 dark:invert sm:h-32"
        />
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

  const byPosition = new Map(podium.map((r) => [r.position, r]));
  // Visual order on the podium: 2nd (left) · 1st (center, raised) · 3rd (right).
  const layout: Array<{
    pos: number;
    step: string;
    avatar: string;
    ring: string;
    num: string;
  }> = [
    { pos: 2, step: "h-16 sm:h-20", avatar: "size-16 sm:size-20", ring: "ring-zinc-400", num: "text-zinc-400" },
    { pos: 1, step: "h-24 sm:h-28", avatar: "size-20 sm:size-24", ring: "ring-yellow-400", num: "text-yellow-400" },
    { pos: 3, step: "h-12 sm:h-16", avatar: "size-16 sm:size-20", ring: "ring-amber-600", num: "text-amber-600" },
  ];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium">{race.name}</p>
          <Button
            render={<Link href={`/race/${race.id}`} />}
            variant="ghost"
            size="sm"
            className="h-auto max-w-[7.5rem] whitespace-normal text-right leading-tight sm:max-w-none sm:whitespace-nowrap"
          >
            {strings.actions.viewResults}
            <ArrowRight className="size-3.5 shrink-0" />
          </Button>
        </div>

        <div className="flex items-end justify-center gap-2 pt-2 sm:gap-5">
          {layout.map((slot) => {
            const result = byPosition.get(slot.pos);
            if (!result) return null;
            const driver = driverMap.get(result.driverId);
            return (
              <div
                key={slot.pos}
                className="flex w-1/3 max-w-[150px] flex-col items-center gap-2"
              >
                <Avatar className={cn(slot.avatar, "ring-2", slot.ring)}>
                  {driver?.photoUrl && (
                    <AvatarImage src={driver.photoUrl} alt={driver.lastName} />
                  )}
                  <AvatarFallback>{driver?.code ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="w-full text-center">
                  <p className="line-clamp-2 text-sm font-semibold leading-tight">
                    {driver
                      ? `${driver.firstName} ${driver.lastName}`
                      : strings.race.driver}
                  </p>
                  {driver?.team?.name && (
                    <p className="truncate text-xs text-muted-foreground">
                      {driver.team.name}
                    </p>
                  )}
                </div>
                <div
                  className={cn(
                    "flex w-full items-start justify-center rounded-t-lg bg-secondary pt-2 font-heading text-2xl font-bold",
                    slot.step,
                    slot.num,
                  )}
                >
                  {slot.pos}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

async function SeasonStandingsSection() {
  let standings;
  try {
    standings = await getStandings();
  } catch {
    return null;
  }
  if (standings.drivers.length === 0 && standings.constructors.length === 0) {
    return null;
  }
  return (
    <StandingsCard
      drivers={standings.drivers}
      constructors={standings.constructors}
      rounds={standings.rounds}
    />
  );
}

async function LatestNewsSection() {
  let sources;
  try {
    sources = await getNews();
  } catch {
    return null;
  }
  if (!sources.some((s) => s.items.length > 0)) {
    return null;
  }
  return <NewsCard sources={sources} />;
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

      <section className="grid gap-8 lg:grid-cols-2 lg:items-stretch">
        <div className="min-w-0">
          <SectionHeading>{strings.standings.title}</SectionHeading>
          <SeasonStandingsSection />
        </div>
        <div className="lg:flex lg:flex-col">
          <SectionHeading>{strings.news.title}</SectionHeading>
          {/* On desktop the news card is capped to the standings height and
              scrolls internally — the absolute child keeps it out of the grid
              row sizing so the standings column stays the height driver. */}
          <div className="lg:relative lg:min-h-0 lg:flex-1">
            <div className="lg:absolute lg:inset-0">
              <LatestNewsSection />
            </div>
          </div>
        </div>
      </section>

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
