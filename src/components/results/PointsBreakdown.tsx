import { Trophy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { strings } from "@/lib/i18n/strings";

export interface BreakdownItem {
  label: string;
  points: number;
}

interface PointsBreakdownProps {
  items: BreakdownItem[];
  total: number;
}

export function PointsBreakdown({ items, total }: PointsBreakdownProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="size-4 text-primary" />
          {strings.results.yourPoints}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 pt-0">
        {items.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            {strings.results.noPrediction}
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-1">
              {items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium tabular-nums">
                    {item.points} {strings.results.pointsShort}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <span className="font-semibold">{strings.results.total}</span>
              <span className="font-heading text-lg font-bold tabular-nums text-primary">
                {total} {strings.results.pointsShort}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
