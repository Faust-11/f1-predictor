import { RaceCard } from "@/components/race/RaceCard";
import { cn } from "@/lib/utils";
import type { Race } from "@/types/race";

interface CalendarGridProps {
  races: Race[];
  className?: string;
}

export function CalendarGrid({ races, className }: CalendarGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {races.map((race) => (
        <RaceCard key={race.id} race={race} />
      ))}
    </div>
  );
}
