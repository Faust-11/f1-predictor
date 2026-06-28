"use client";

import { Check } from "lucide-react";

import type { Team } from "@/types/team";
import { cn } from "@/lib/utils";

interface TeamCardProps {
  team: Team;
  selected: boolean;
  readOnly?: boolean;
  onSelect: () => void;
}

export function TeamCard({ team, selected, readOnly, onSelect }: TeamCardProps) {
  return (
    <button
      type="button"
      disabled={readOnly}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50",
        readOnly && "cursor-default hover:border-border hover:bg-transparent",
      )}
    >
      <span
        className="size-3 shrink-0 rounded-full bg-border"
        style={team.colorHex ? { backgroundColor: team.colorHex } : undefined}
      />
      <span className="min-w-0 flex-1 truncate font-medium">{team.name}</span>
      {selected && <Check className="size-4 shrink-0 text-primary" />}
    </button>
  );
}
