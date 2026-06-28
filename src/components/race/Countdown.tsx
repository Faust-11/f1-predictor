"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { strings } from "@/lib/i18n/strings";
import { cn } from "@/lib/utils";

interface CountdownProps {
  target: string | null;
  label?: string;
  className?: string;
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-heading text-2xl font-bold tabular-nums sm:text-3xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function Countdown({ target, label, className }: CountdownProps) {
  const parts = useCountdown(target);

  if (!parts) {
    return (
      <div
        className={cn("h-12 w-48 animate-pulse rounded-md bg-muted", className)}
        aria-hidden
      />
    );
  }

  if (parts.isComplete) {
    return (
      <p className={cn("text-sm font-medium text-primary", className)}>
        {strings.race.started}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
      <div className="flex items-center gap-3">
        <Unit value={parts.days} label={strings.countdown.days} />
        <span className="text-xl text-muted-foreground">:</span>
        <Unit value={parts.hours} label={strings.countdown.hours} />
        <span className="text-xl text-muted-foreground">:</span>
        <Unit value={parts.minutes} label={strings.countdown.minutes} />
        <span className="text-xl text-muted-foreground">:</span>
        <Unit value={parts.seconds} label={strings.countdown.seconds} />
      </div>
    </div>
  );
}
