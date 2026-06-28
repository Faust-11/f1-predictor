"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { DriverCard } from "@/components/prediction/DriverCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { DriverWithTeam } from "@/lib/data/drivers";
import { strings } from "@/lib/i18n/strings";
import { cn } from "@/lib/utils";

interface DriverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drivers: DriverWithTeam[];
  /** Driver ids already used in other slots (shown disabled). */
  takenIds: Set<string>;
  onSelect: (driverId: string) => void;
}

function matches(driver: DriverWithTeam, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    driver.firstName.toLowerCase().includes(q) ||
    driver.lastName.toLowerCase().includes(q) ||
    driver.code.toLowerCase().includes(q)
  );
}

export function DriverModal({
  open,
  onOpenChange,
  drivers,
  takenIds,
  onSelect,
}: DriverModalProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => drivers.filter((d) => matches(d, query)),
    [drivers, query],
  );

  function handleSelect(id: string) {
    onSelect(id);
    onOpenChange(false);
    setQuery("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery("");
      }}
    >
      <DialogContent className="max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{strings.predictions.pickDriver}</DialogTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={strings.actions.search}
              aria-label={strings.actions.search}
              className="pl-9"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              {strings.states.driversEmpty}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {filtered.map((driver) => {
                const taken = takenIds.has(driver.id);
                return (
                  <li key={driver.id}>
                    <button
                      type="button"
                      disabled={taken}
                      onClick={() => handleSelect(driver.id)}
                      className={cn(
                        "w-full rounded-md p-2 transition-colors",
                        taken
                          ? "cursor-not-allowed opacity-40"
                          : "hover:bg-muted",
                      )}
                    >
                      <DriverCard driver={driver} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
