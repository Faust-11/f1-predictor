"use client";

import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import type {
  ConstructorStandingEntry,
  DriverStandingEntry,
} from "@/lib/data/standings";
import { strings } from "@/lib/i18n/strings";
import { cn } from "@/lib/utils";

type Tab = "drivers" | "constructors";

interface StandingsCardProps {
  drivers: DriverStandingEntry[];
  constructors: ConstructorStandingEntry[];
}

function PositionBadge({ position }: { position: number }) {
  const isPodium = position <= 3;
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
        isPodium
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-muted-foreground",
      )}
    >
      {position}
    </span>
  );
}

function TeamStripe({ color }: { color: string | null }) {
  return (
    <span
      className="h-6 w-1 shrink-0 rounded-full bg-border"
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}

function Points({ value }: { value: number }) {
  return (
    <span className="shrink-0 text-sm font-bold tabular-nums">{value}</span>
  );
}

export function StandingsCard({ drivers, constructors }: StandingsCardProps) {
  const [tab, setTab] = useState<Tab>("drivers");
  const s = strings.standings;
  const rows = tab === "drivers" ? drivers : constructors;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="inline-flex w-fit rounded-lg bg-secondary p-1">
          {(["drivers", "constructors"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "drivers" ? s.drivers : s.constructors}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {s.empty}
          </p>
        ) : (
          <ul className="flex flex-col">
            {tab === "drivers"
              ? drivers.map((row) => (
                  <li
                    key={row.code || row.name}
                    className="flex items-center gap-3 border-b border-border/60 py-2 last:border-0"
                  >
                    <PositionBadge position={row.position} />
                    <TeamStripe color={row.teamColor} />
                    <Avatar className="size-8">
                      {row.photoUrl && (
                        <AvatarImage src={row.photoUrl} alt={row.name} />
                      )}
                      <AvatarFallback>{row.code || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.teamName}
                      </p>
                    </div>
                    <Points value={row.points} />
                  </li>
                ))
              : constructors.map((row) => (
                  <li
                    key={row.name}
                    className="flex items-center gap-3 border-b border-border/60 py-2 last:border-0"
                  >
                    <PositionBadge position={row.position} />
                    <TeamStripe color={row.teamColor} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {row.name}
                    </span>
                    <Points value={row.points} />
                  </li>
                ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
