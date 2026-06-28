import { CalendarX } from "lucide-react";

import { PredictionGrid } from "@/components/prediction/PredictionGrid";
import { PredictionHeader } from "@/components/prediction/PredictionHeader";
import { PointsBreakdown } from "@/components/results/PointsBreakdown";
import { ResultsTable } from "@/components/results/ResultsTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { getDriversWithTeams } from "@/lib/data/drivers";
import { getUserPredictionsForRace } from "@/lib/data/predictions";
import { getRaceById } from "@/lib/data/races";
import { getQualifyingResults, getRaceResults } from "@/lib/data/results";
import { getCurrentUser } from "@/lib/data/user";
import { strings } from "@/lib/i18n/strings";
import { isPredictionLocked } from "@/lib/predictions/deadline";
import { deriveInitialFormState } from "@/lib/predictions/initial";
import { buildBreakdownItems } from "@/lib/scoring/breakdown";
import { buildScoringContext } from "@/lib/scoring/context";
import type { DriverWithTeam } from "@/lib/data/drivers";
import type { Prediction } from "@/types/prediction";

export const dynamic = "force-dynamic";

export default async function QualifyingPage({
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
  let predictions: Prediction[] = [];
  let hasDisplayName = false;

  try {
    const [driversData, predictionsData, user] = await Promise.all([
      getDriversWithTeams(),
      getUserPredictionsForRace(raceId),
      getCurrentUser(),
    ]);
    drivers = driversData;
    predictions = predictionsData;
    hasDisplayName = Boolean(user?.displayName);
  } catch {
    return <ErrorState />;
  }

  const locked = isPredictionLocked(race, "qualifying");
  const initial = deriveInitialFormState(predictions, "qualifying");
  const qualiPredictions = predictions.filter((p) =>
    p.type.startsWith("qualifying"),
  );

  let resultsNode = null;
  if (race.status === "completed") {
    const [qualifying, raceResults] = await Promise.all([
      getQualifyingResults(raceId),
      getRaceResults(raceId),
    ]);
    const driverMap = new Map(drivers.map((d) => [d.id, d]));
    const driverTeam = new Map(drivers.map((d) => [d.id, d.teamId]));
    const ctx = buildScoringContext(qualifying, raceResults, driverTeam);
    const { items, total } = buildBreakdownItems(qualiPredictions, ctx);

    resultsNode = (
      <div className="grid gap-4 sm:grid-cols-2">
        {qualifying.length > 0 ? (
          <ResultsTable
            title={strings.results.qualifyingResults}
            results={qualifying.map((r) => ({
              driverId: r.driverId,
              position: r.position,
            }))}
            driverMap={driverMap}
          />
        ) : (
          <EmptyState message={strings.states.resultsEmpty} />
        )}
        <PointsBreakdown items={items} total={total} />
      </div>
    );
  }

  const noSavedPrediction = qualiPredictions.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PredictionHeader race={race} active="qualifying" />

      {resultsNode}

      {drivers.length === 0 ? (
        <EmptyState message={strings.states.driversEmpty} />
      ) : locked && noSavedPrediction ? (
        <EmptyState message={strings.predictions.deadlinePassed} />
      ) : (
        <PredictionGrid
          kind="qualifying"
          raceId={race.id}
          drivers={drivers}
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
