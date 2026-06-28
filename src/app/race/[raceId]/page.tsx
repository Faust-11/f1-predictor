import { CalendarX } from "lucide-react";

import { PredictionGrid } from "@/components/prediction/PredictionGrid";
import { PredictionHeader } from "@/components/prediction/PredictionHeader";
import { PointsBreakdown } from "@/components/results/PointsBreakdown";
import { ResultsTable } from "@/components/results/ResultsTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { getDriverMap, getDriversWithTeams } from "@/lib/data/drivers";
import { getUserPredictionsForRace } from "@/lib/data/predictions";
import { getRaceById } from "@/lib/data/races";
import { getRaceGaps } from "@/lib/data/race-gaps";
import { getQualifyingResults, getRaceResults } from "@/lib/data/results";
import { getTeams } from "@/lib/data/teams";
import { getCurrentUser } from "@/lib/data/user";
import { strings } from "@/lib/i18n/strings";
import { isPredictionLocked } from "@/lib/predictions/deadline";
import { deriveInitialFormState } from "@/lib/predictions/initial";
import { buildBreakdownItems } from "@/lib/scoring/breakdown";
import { buildScoringContext } from "@/lib/scoring/context";
import type { DriverWithTeam } from "@/lib/data/drivers";
import type { Prediction } from "@/types/prediction";
import type { Team } from "@/types/team";

export const dynamic = "force-dynamic";

export default async function RacePage({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const { raceId } = await params;

  const race = await getRaceById(raceId).catch(() => undefined);
  if (race === undefined) {
    return <ErrorState />;
  }
  if (race === null) {
    return (
      <EmptyState
        message={strings.states.raceNotFound}
        icon={CalendarX}
        action={{ label: strings.actions.goToCalendar, href: "/calendar" }}
      />
    );
  }

  let drivers: DriverWithTeam[];
  let teams: Team[] = [];
  let predictions: Prediction[] = [];
  let hasDisplayName = false;

  try {
    const [driversData, teamsData, predictionsData, user] = await Promise.all([
      getDriversWithTeams(),
      getTeams(),
      getUserPredictionsForRace(raceId),
      getCurrentUser(),
    ]);
    drivers = driversData;
    teams = teamsData;
    predictions = predictionsData;
    hasDisplayName = Boolean(user?.displayName);
  } catch {
    return <ErrorState />;
  }

  const locked = isPredictionLocked(race, "race");
  const initial = deriveInitialFormState(predictions, "race");
  const racePredictions = predictions.filter((p) => p.type.startsWith("race"));

  let resultsNode = null;
  if (race.status === "completed") {
    const [qualifying, raceResults, gaps, driverMap] = await Promise.all([
      getQualifyingResults(raceId),
      getRaceResults(raceId),
      getRaceGaps(race),
      getDriverMap(),
    ]);
    // Map every driver id (incl. duplicate rows) to its team via the canonical map.
    const driverTeam = new Map(
      [...driverMap].map(([id, d]) => [id, d.teamId]),
    );
    const ctx = buildScoringContext(qualifying, raceResults, driverTeam);
    const { items, total } = buildBreakdownItems(racePredictions, ctx);

    resultsNode = (
      <div className="grid gap-4 sm:grid-cols-2">
        {raceResults.length > 0 ? (
          <ResultsTable
            title={strings.results.raceResults}
            results={raceResults.map((r) => ({
              driverId: r.driverId,
              position: r.position,
              dnf: r.dnf,
            }))}
            driverMap={driverMap}
            gaps={gaps}
          />
        ) : (
          <EmptyState message={strings.states.resultsEmpty} />
        )}
        <PointsBreakdown items={items} total={total} />
      </div>
    );
  }

  const noSavedPrediction = racePredictions.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PredictionHeader race={race} active="race" />

      {resultsNode}

      {drivers.length === 0 ? (
        <EmptyState message={strings.states.driversEmpty} />
      ) : locked && noSavedPrediction ? (
        <EmptyState message={strings.predictions.deadlinePassed} />
      ) : (
        <PredictionGrid
          kind="race"
          raceId={race.id}
          drivers={drivers}
          teams={teams}
          locked={locked}
          hasDisplayName={hasDisplayName}
          initialMode={initial.mode}
          initialSlots={initial.slots}
          initialDnf={initial.dnf}
        />
      )}
    </div>
  );
}
