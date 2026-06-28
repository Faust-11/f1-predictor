import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatDateUk } from "@/lib/i18n/date";
import { strings } from "@/lib/i18n/strings";
import type { PredictionKind } from "@/lib/predictions/deadline";
import { cn } from "@/lib/utils";
import type { Race } from "@/types/race";

interface PredictionHeaderProps {
  race: Race;
  active: PredictionKind;
}

function Tab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-muted",
      )}
    >
      {label}
    </Link>
  );
}

export function PredictionHeader({ race, active }: PredictionHeaderProps) {
  const sessionIso =
    active === "qualifying" ? race.qualifyingAtUtc : race.raceAtUtc;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {strings.race.round} {race.round}
          </Badge>
          {race.status === "live" && (
            <Badge variant="live">{strings.race.live}</Badge>
          )}
          {race.status === "completed" && (
            <Badge variant="completed">{strings.race.completed}</Badge>
          )}
        </div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">
          {race.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {[race.country, race.circuit].filter(Boolean).join(" · ")}
          {sessionIso
            ? ` · ${formatDateUk(sessionIso, "d MMMM yyyy, HH:mm")}`
            : ""}
        </p>
      </div>

      <div className="flex gap-2">
        <Tab
          href={`/qualifying/${race.id}`}
          label={strings.race.qualifying}
          active={active === "qualifying"}
        />
        <Tab
          href={`/race/${race.id}`}
          label={strings.race.raceDay}
          active={active === "race"}
        />
      </div>
    </div>
  );
}
