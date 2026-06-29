"use client";

import { useState } from "react";
import { ChevronsRight } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { flagUrl } from "@/lib/country-flag";
import type {
  ConstructorStandingEntry,
  DriverStandingEntry,
  StandingsRound,
} from "@/lib/data/standings";
import { strings } from "@/lib/i18n/strings";
import { cn } from "@/lib/utils";

type Tab = "drivers" | "constructors";

interface StandingsCardProps {
  drivers: DriverStandingEntry[];
  constructors: ConstructorStandingEntry[];
  rounds: StandingsRound[];
}

// On mobile only the first N rows show; the rest expand via a button.
const COLLAPSE_LIMIT = 10;

// Single sticky identity column (position + driver) — keeping it one column
// avoids gaps where scrolling cells would peek between two sticky columns.
const IDENTITY_CELL = "sticky left-0 z-20 w-48 bg-card";

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

function PerGpCells({
  perGp,
  rounds,
}: {
  perGp: Record<number, number>;
  rounds: StandingsRound[];
}) {
  return (
    <>
      {rounds.map((r) => (
        <td
          key={r.round}
          className="border-b border-border/60 px-2 py-2 text-center tabular-nums text-muted-foreground"
        >
          {r.round in perGp ? perGp[r.round] : "·"}
        </td>
      ))}
    </>
  );
}

export function StandingsCard({
  drivers,
  constructors,
  rounds,
}: StandingsCardProps) {
  const [tab, setTab] = useState<Tab>("drivers");
  const [expanded, setExpanded] = useState(false);
  const s = strings.standings;
  const isDrivers = tab === "drivers";
  const rows = isDrivers ? drivers : constructors;

  const rowHiddenClass = (index: number) =>
    !expanded && index >= COLLAPSE_LIMIT ? "hidden lg:table-row" : "";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
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
          {rounds.length > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              {s.perGpHint}
              <ChevronsRight className="size-4" />
            </span>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {s.empty}
          </p>
        ) : (
          <>
            <div className="min-w-0 overflow-x-auto">
              <table className="border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className={cn(IDENTITY_CELL, "py-2")} />
                    <th className="px-3 py-2 text-right font-medium">
                      {s.points}
                    </th>
                    {rounds.map((r) => (
                      <th
                        key={r.round}
                        title={r.name}
                        className="px-2 py-2 text-center font-medium"
                      >
                        {r.countryIso ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={flagUrl(r.countryIso)}
                            alt={r.name}
                            width={20}
                            height={20}
                            loading="lazy"
                            className="mx-auto size-5 rounded-full"
                          />
                        ) : (
                          <span>{r.round}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isDrivers
                    ? drivers.map((row, index) => (
                        <tr
                          key={row.code || row.name}
                          className={rowHiddenClass(index)}
                        >
                          <td
                            className={cn(
                              IDENTITY_CELL,
                              "border-b border-border/60 py-2 pr-3",
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <PositionBadge position={row.position} />
                              <Avatar className="size-7 shrink-0">
                                {row.photoUrl && (
                                  <AvatarImage
                                    src={row.photoUrl}
                                    alt={row.name}
                                  />
                                )}
                                <AvatarFallback>
                                  {row.code || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium leading-tight">
                                  {row.name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {row.teamName}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="border-b border-border/60 px-3 py-2 text-right font-heading font-bold tabular-nums text-primary">
                            {row.points}
                          </td>
                          <PerGpCells perGp={row.perGp} rounds={rounds} />
                        </tr>
                      ))
                    : constructors.map((row, index) => (
                        <tr key={row.name} className={rowHiddenClass(index)}>
                          <td
                            className={cn(
                              IDENTITY_CELL,
                              "border-b border-border/60 py-2 pr-3",
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <PositionBadge position={row.position} />
                              <span
                                className="h-5 w-1 shrink-0 rounded-full bg-border"
                                style={
                                  row.teamColor
                                    ? { backgroundColor: row.teamColor }
                                    : undefined
                                }
                              />
                              <span className="truncate text-sm font-medium">
                                {row.name}
                              </span>
                            </div>
                          </td>
                          <td className="border-b border-border/60 px-3 py-2 text-right font-heading font-bold tabular-nums text-primary">
                            {row.points}
                          </td>
                          <PerGpCells perGp={row.perGp} rounds={rounds} />
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {rows.length > COLLAPSE_LIMIT && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 rounded-md py-1.5 text-sm font-medium text-primary hover:underline lg:hidden"
              >
                {expanded ? s.showLess : s.showMore}
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
