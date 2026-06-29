"use client";

import { Check, Flag } from "lucide-react";

import { TeamCard } from "@/components/prediction/TeamCard";
import { strings } from "@/lib/i18n/strings";
import type { DnfSelection } from "@/lib/predictions/types";
import { cn } from "@/lib/utils";
import type { Team } from "@/types/team";

interface DnfPickerProps {
  teams: Team[];
  value: DnfSelection;
  readOnly?: boolean;
  onChange: (value: DnfSelection) => void;
}

/** Pick any number of teams whose car will retire, OR "everyone finishes". */
export function DnfPicker({ teams, value, readOnly, onChange }: DnfPickerProps) {
  const allSelected = value?.kind === "all";
  const selectedTeamIds = value?.kind === "teams" ? value.teamIds : [];

  function toggleTeam(teamId: string) {
    const next = selectedTeamIds.includes(teamId)
      ? selectedTeamIds.filter((id) => id !== teamId)
      : [...selectedTeamIds, teamId];
    onChange(next.length > 0 ? { kind: "teams", teamIds: next } : null);
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-heading text-lg font-bold">
        {strings.predictions.dnfQuestion}
      </h3>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            readOnly={readOnly}
            selected={selectedTeamIds.includes(team.id)}
            onSelect={() => toggleTeam(team.id)}
          />
        ))}
      </div>

      <button
        type="button"
        disabled={readOnly}
        aria-pressed={allSelected}
        onClick={() => onChange({ kind: "all" })}
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-colors",
          allSelected
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50",
          readOnly && "cursor-default hover:border-border hover:bg-transparent",
        )}
      >
        <Flag className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1">{strings.predictions.allFinish}</span>
        {allSelected && <Check className="size-4 shrink-0 text-primary" />}
      </button>
    </div>
  );
}
