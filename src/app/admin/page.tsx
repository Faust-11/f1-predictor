import { RaceAdminList } from "@/components/admin/RaceAdminList";
import { SyncLogsTable } from "@/components/admin/SyncLogsTable";
import { SyncPanel } from "@/components/admin/SyncPanel";
import { ErrorState } from "@/components/shared/ErrorState";
import { getDriversWithTeams, type DriverWithTeam } from "@/lib/data/drivers";
import { getRaces } from "@/lib/data/races";
import { getResultsForRaces } from "@/lib/data/results";
import { getSyncLogs } from "@/lib/data/sync-logs";
import type { Race } from "@/types/race";
import type { QualifyingResult, RaceResult } from "@/types/result";
import type { SyncLog } from "@/types/sync-log";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let races: Race[];
  let drivers: DriverWithTeam[];
  let logs: SyncLog[];
  let allQualifying: QualifyingResult[];
  let allRace: RaceResult[];

  try {
    [races, drivers, logs] = await Promise.all([
      getRaces(),
      getDriversWithTeams(),
      getSyncLogs(),
    ]);
    const { qualifying, race } = await getResultsForRaces(
      races.map((r) => r.id),
    );
    allQualifying = [...qualifying.values()].flat();
    allRace = [...race.values()].flat();
  } catch {
    return <ErrorState />;
  }

  return (
    <div className="flex flex-col gap-6">
      <SyncPanel />
      <RaceAdminList
        races={races}
        drivers={drivers}
        qualifying={allQualifying}
        raceResults={allRace}
      />
      <SyncLogsTable logs={logs} />
    </div>
  );
}
