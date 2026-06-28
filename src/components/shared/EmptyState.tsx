import Link from "next/link";
import { Inbox, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  message: string;
  icon?: LucideIcon;
  /** Optional call-to-action link */
  action?: { label: string; href: string };
  className?: string;
}

/** Empty state: muted icon + message + optional action link (UI_Guide §8). */
export function EmptyState({
  message,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      <Icon className="size-8 text-muted-foreground" />
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {action && (
        <Button render={<Link href={action.href} />} variant="outline" size="lg">
          {action.label}
        </Button>
      )}
    </div>
  );
}
