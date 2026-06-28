import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DriverWithTeam } from "@/lib/data/drivers";
import { strings } from "@/lib/i18n/strings";
import { cn } from "@/lib/utils";

export interface ResultEntry {
  driverId: string;
  position: number | null;
  dnf?: boolean;
}

interface ResultsTableProps {
  title: string;
  results: ResultEntry[];
  driverMap: Map<string, DriverWithTeam>;
  /** Optional finishing gaps keyed by driver CODE (e.g. "+2.974"). */
  gaps?: Map<string, string>;
}

function sortResults(results: ResultEntry[]): ResultEntry[] {
  return [...results].sort((a, b) => {
    const aDnf = a.dnf || a.position == null;
    const bDnf = b.dnf || b.position == null;
    if (aDnf !== bDnf) return aDnf ? 1 : -1;
    return (a.position ?? 999) - (b.position ?? 999);
  });
}

export function ResultsTable({
  title,
  results,
  driverMap,
  gaps,
}: ResultsTableProps) {
  const sorted = sortResults(results);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-3">
        <ul className="flex flex-col">
          {sorted.map((entry) => {
            const driver = driverMap.get(entry.driverId);
            const isDnf = entry.dnf || entry.position == null;
            const gap = driver?.code ? gaps?.get(driver.code.toUpperCase()) : undefined;
            return (
              <li
                key={entry.driverId}
                className="flex items-center gap-3 border-b border-border/60 px-2 py-2 last:border-0"
              >
                <span
                  className={cn(
                    "flex w-7 shrink-0 justify-center text-sm font-semibold tabular-nums",
                    isDnf ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {isDnf ? "—" : entry.position}
                </span>
                <span
                  className="h-5 w-1 shrink-0 rounded-full bg-border"
                  style={
                    driver?.team?.colorHex
                      ? { backgroundColor: driver.team.colorHex }
                      : undefined
                  }
                />
                <Avatar className={cn("size-8", isDnf && "opacity-50")}>
                  {driver?.photoUrl && (
                    <AvatarImage
                      src={driver.photoUrl}
                      alt={driver.lastName}
                    />
                  )}
                  <AvatarFallback>{driver?.code ?? "?"}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {driver
                    ? `${driver.firstName} ${driver.lastName}`
                    : strings.race.driver}
                </span>
                {!isDnf && gap && (
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {gap}
                  </span>
                )}
                {isDnf && (
                  <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {strings.results.dnf}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
