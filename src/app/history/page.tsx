import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { ShareButton } from "@/components/prediction/ShareButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { getDriverMap, type DriverWithTeam } from "@/lib/data/drivers";
import { getAllUserPredictions } from "@/lib/data/predictions";
import { getRaces } from "@/lib/data/races";
import { getTeams } from "@/lib/data/teams";
import { strings } from "@/lib/i18n/strings";
import type { Prediction } from "@/types/prediction";
import type { Race } from "@/types/race";
import type { Team } from "@/types/team";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: strings.pages.history,
};

type Session = "qualifying" | "race";

function composeShareText(
  preds: Prediction[],
  session: Session,
  driverMap: Map<string, DriverWithTeam>,
  teams: Team[],
): string {
  const lines: string[] = [
    session === "qualifying"
      ? strings.share.qualifyingHeader
      : strings.share.raceHeader,
  ];

  const posPred = preds.find(
    (p) => p.type.endsWith("podium") || p.type.endsWith("top10"),
  );
  if (posPred) {
    const payload = posPred.payload as Record<string, string>;
    const order = Object.keys(payload)
      .map(Number)
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b);
    for (const pos of order) {
      const driver = driverMap.get(payload[String(pos)]);
      if (driver) lines.push(`${pos}. ${driver.firstName} ${driver.lastName}`);
    }
  }

  const dnfPred = preds.find((p) => p.type === "race_dnf");
  if (dnfPred) {
    const pl = dnfPred.payload;
    if ("allFinish" in pl && pl.allFinish) {
      lines.push(strings.share.allFinish);
    } else if ("teamIds" in pl && Array.isArray(pl.teamIds)) {
      const names = pl.teamIds
        .map((id) => teams.find((t) => t.id === id)?.name)
        .filter((n): n is string => Boolean(n));
      if (names.length) lines.push(`${strings.share.dnf}: ${names.join(", ")}`);
    }
  }

  return lines.join("\n");
}

export default async function HistoryPage() {
  let predictions: Prediction[];
  let races: Race[];
  let driverMap: Map<string, DriverWithTeam>;
  let teams: Team[];

  try {
    [predictions, races, driverMap, teams] = await Promise.all([
      getAllUserPredictions(),
      getRaces(),
      getDriverMap(),
      getTeams(),
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
  interface Group {
    key: string;
    raceId: string;
    session: Session;
    round: number;
    name: string;
    completed: boolean;
    points: number;
    scored: boolean;
    preds: Prediction[];
  }

  const groups = new Map<string, Group>();
  for (const prediction of predictions) {
    const race = raceMap.get(prediction.raceId);
    const session: Session = prediction.type.startsWith("qualifying")
      ? "qualifying"
      : "race";
    const key = `${prediction.raceId}__${session}`;

    const group =
      groups.get(key) ??
      ({
        key,
        raceId: prediction.raceId,
        session,
        round: race?.round ?? 0,
        name: race?.name ?? strings.race.driver,
        completed: race?.status === "completed",
        points: 0,
        scored: false,
        preds: [],
      } satisfies Group);

    group.preds.push(prediction);
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
          const shareText = composeShareText(
            group.preds,
            group.session,
            driverMap,
            teams,
          );

          return (
            <li key={group.key} className="flex items-center gap-3">
              <Link href={href} className="min-w-0 flex-1">
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
              <ShareButton text={shareText} path={href} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
