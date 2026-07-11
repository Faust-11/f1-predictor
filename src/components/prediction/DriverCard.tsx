import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DriverWithTeam } from "@/lib/data/drivers";
import { cn } from "@/lib/utils";

interface DriverCardProps {
  driver: DriverWithTeam;
  className?: string;
}

/** Presentational pilot card: photo, name, code, team accent. */
export function DriverCard({ driver, className }: DriverCardProps) {
  const teamColor = driver.team?.colorHex ?? undefined;

  return (
    <div className={cn("flex items-center gap-3 text-left", className)}>
      <Avatar
        className="size-9"
        style={
          teamColor ? { boxShadow: `0 0 0 2px ${teamColor}` } : undefined
        }
      >
        {driver.photoUrl && (
          <AvatarImage src={driver.photoUrl} alt={driver.lastName} />
        )}
        <AvatarFallback>{driver.code}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium leading-tight">
          {driver.firstName} {driver.lastName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {driver.code}
          {driver.team?.name ? ` · ${driver.team.name}` : ""}
        </p>
      </div>
    </div>
  );
}
