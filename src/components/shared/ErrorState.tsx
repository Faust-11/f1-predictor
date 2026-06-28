"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { strings } from "@/lib/i18n/strings";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  message?: string;
  /** If provided, renders a retry button (variant="outline" per UI_Guide §8). */
  onRetry?: () => void;
  className?: string;
}

/** Error state: warning icon + message + outline retry button. */
export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card px-6 py-12 text-center",
        className,
      )}
    >
      <AlertTriangle className="size-8 text-muted-foreground" />
      <p className="max-w-md text-sm text-muted-foreground">
        {message ?? strings.states.apiUnavailable}
      </p>
      {onRetry && (
        <Button variant="outline" size="lg" onClick={onRetry}>
          {strings.actions.retry}
        </Button>
      )}
    </div>
  );
}
