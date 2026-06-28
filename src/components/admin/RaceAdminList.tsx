"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";

import { ManualResultsEditor } from "@/components/admin/ManualResultsEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recalcRace, setRaceStatus } from "@/lib/actions/admin";
import type { DriverWithTeam } from "@/lib/data/drivers";
import { cn } from "@/lib/utils";
import type { Race, RaceStatus } from "@/types/race";
import type { QualifyingResult, RaceResult } from "@/types/result";

interface RaceAdminListProps {
  races: Race[];
  drivers: DriverWithTeam[];
  qualifying: QualifyingResult[];
  raceResults: RaceResult[];
}

const STATUSES: RaceStatus[] = ["upcoming", "live", "completed"];

function RaceRow({
  race,
  drivers,
  qualiInitial,
  raceInitial,
}: {
  race: Race;
  drivers: DriverWithTeam[];
  qualiInitial: Map<string, { position: number | null }>;
  raceInitial: Map<string, { position: number | null; dnf?: boolean }>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex flex-col gap-2 border-b border-border/60 py-3 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-8 text-xs text-muted-foreground">#{race.round}</span>
        <span className="flex-1 truncate text-sm font-medium">{race.name}</span>

        <select
          defaultValue={race.status}
          disabled={pending}
          onChange={(e) =>
            startTransition(() =>
              setRaceStatus(race.id, e.target.value as RaceStatus).then(() => {}),
            )
          }
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => recalcRace(race.id).then(() => {}))}
        >
          Перерахувати
        </Button>

        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
          Результати
          <ChevronDown
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </Button>
      </div>

      {open && (
        <div className="grid gap-3 md:grid-cols-2">
          <ManualResultsEditor
            raceId={race.id}
            kind="qualifying"
            drivers={drivers}
            initial={qualiInitial}
          />
          <ManualResultsEditor
            raceId={race.id}
            kind="race"
            drivers={drivers}
            initial={raceInitial}
          />
        </div>
      )}
    </li>
  );
}

export function RaceAdminList({
  races,
  drivers,
  qualifying,
  raceResults,
}: RaceAdminListProps) {
  const qualiByRace = new Map<string, Map<string, { position: number | null }>>();
  for (const r of qualifying) {
    const map = qualiByRace.get(r.raceId) ?? new Map();
    map.set(r.driverId, { position: r.position });
    qualiByRace.set(r.raceId, map);
  }

  const raceByRace = new Map<
    string,
    Map<string, { position: number | null; dnf?: boolean }>
  >();
  for (const r of raceResults) {
    const map = raceByRace.get(r.raceId) ?? new Map();
    map.set(r.driverId, { position: r.position, dnf: r.dnf });
    raceByRace.set(r.raceId, map);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Етапи</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col">
          {races.map((race) => (
            <RaceRow
              key={race.id}
              race={race}
              drivers={drivers}
              qualiInitial={qualiByRace.get(race.id) ?? new Map()}
              raceInitial={raceByRace.get(race.id) ?? new Map()}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
