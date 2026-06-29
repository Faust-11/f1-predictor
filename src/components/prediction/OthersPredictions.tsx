"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { OtherPrediction } from "@/lib/data/others-predictions";
import { strings } from "@/lib/i18n/strings";
import { cn } from "@/lib/utils";

function PredictionRow({ item }: { item: OtherPrediction }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-secondary/50"
      >
        <span className="min-w-0 flex-1 truncate font-medium">
          {item.name || strings.leaderboard.anonymous}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {item.scored ? (
            <span className="font-heading text-sm font-bold tabular-nums text-primary">
              {item.points} {strings.results.pointsShort}
            </span>
          ) : (
            <Badge variant="outline">{strings.history.pending}</Badge>
          )}
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-1.5 border-t border-border/60 p-3">
          {item.positions.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            item.positions.map((p) => (
              <div key={p.position} className="flex items-center gap-2 text-sm">
                <span className="w-5 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                  {p.position}
                </span>
                <span
                  className="h-4 w-1 shrink-0 rounded-full bg-border"
                  style={
                    p.teamColor ? { backgroundColor: p.teamColor } : undefined
                  }
                />
                <span className="truncate">{p.driverName}</span>
              </div>
            ))
          )}
          {item.dnf && (
            <p className="pt-1 text-xs text-muted-foreground">
              {strings.share.dnf}: {item.dnf}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export function OthersPredictions({ items }: { items: OtherPrediction[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground sm:p-6">
          {strings.predictions.othersEmpty}
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <PredictionRow key={item.userId} item={item} />
      ))}
    </ul>
  );
}
