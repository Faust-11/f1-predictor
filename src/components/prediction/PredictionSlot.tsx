"use client";

import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";

import { DriverCard } from "@/components/prediction/DriverCard";
import type { DriverWithTeam } from "@/lib/data/drivers";
import { strings } from "@/lib/i18n/strings";
import { cn } from "@/lib/utils";

interface PredictionSlotProps {
  position: number;
  driver: DriverWithTeam | null;
  readOnly?: boolean;
  onPick: () => void;
  onClear: () => void;
}

export function PredictionSlot({
  position,
  driver,
  readOnly = false,
  onPick,
  onClear,
}: PredictionSlotProps) {
  return (
    <div className="flex items-stretch gap-2">
      <div className="flex w-10 shrink-0 items-center justify-center rounded-md bg-secondary font-heading text-sm font-bold text-secondary-foreground">
        P{position}
      </div>

      <div className="relative flex-1">
        <button
          type="button"
          onClick={onPick}
          disabled={readOnly}
          className={cn(
            "flex min-h-[3.25rem] w-full items-center rounded-md border px-3 py-2 text-left transition-colors",
            driver ? "border-border bg-card" : "border-dashed border-border",
            readOnly
              ? "cursor-default"
              : "hover:border-primary/50 hover:bg-muted/50",
          )}
        >
          {driver ? (
            <motion.div
              key={driver.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full pr-6"
            >
              <DriverCard driver={driver} />
            </motion.div>
          ) : (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Plus className="size-4" />
              {strings.predictions.pickDriver}
            </span>
          )}
        </button>

        {driver && !readOnly && (
          <button
            type="button"
            onClick={onClear}
            aria-label={strings.actions.clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
