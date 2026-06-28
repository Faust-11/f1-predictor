"use client";

import { useState, useTransition } from "react";

import { DnfPicker } from "@/components/prediction/DnfPicker";
import { DriverModal } from "@/components/prediction/DriverModal";
import { PredictionSlot } from "@/components/prediction/PredictionSlot";
import { ShareButton } from "@/components/prediction/ShareButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { PODIUM_SLOTS, TOP10_SLOTS } from "@/lib/constants";
import { savePrediction } from "@/lib/actions/predictions";
import type { DriverWithTeam } from "@/lib/data/drivers";
import { strings } from "@/lib/i18n/strings";
import type { PredictionKind } from "@/lib/predictions/deadline";
import {
  dnfSelectionToPayload,
  type DnfSelection,
} from "@/lib/predictions/types";
import { cn } from "@/lib/utils";
import type { PredictionType } from "@/types/prediction";
import type { Team } from "@/types/team";

type Mode = "podium" | "top10";

interface PredictionGridProps {
  kind: PredictionKind;
  raceId: string;
  drivers: DriverWithTeam[];
  teams?: Team[];
  locked: boolean;
  hasDisplayName: boolean;
  initialMode: Mode;
  initialSlots: Record<string, string>;
  initialDnf: DnfSelection;
}

function positionTypeFor(kind: PredictionKind, mode: Mode): PredictionType {
  if (kind === "qualifying") {
    return mode === "podium" ? "qualifying_podium" : "qualifying_top10";
  }
  return mode === "podium" ? "race_podium" : "race_top10";
}

export function PredictionGrid({
  kind,
  raceId,
  drivers,
  teams = [],
  locked,
  hasDisplayName,
  initialMode,
  initialSlots,
  initialDnf,
}: PredictionGridProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [slots, setSlots] = useState<Record<string, string>>(initialSlots);
  const [dnf, setDnf] = useState<DnfSelection>(initialDnf);
  const [name, setName] = useState("");
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const driverMap = new Map(drivers.map((d) => [d.id, d]));
  const slotCount = mode === "podium" ? PODIUM_SLOTS : TOP10_SLOTS;
  const positions = Array.from({ length: slotCount }, (_, i) => i + 1);
  const takenIds = new Set(
    positions.map((p) => slots[String(p)]).filter(Boolean) as string[],
  );

  const slotsComplete = positions.every((p) => slots[String(p)]);

  function selectDriver(driverId: string) {
    if (activeSlot == null) return;
    setSlots((prev) => ({ ...prev, [String(activeSlot)]: driverId }));
  }

  function clearSlot(position: number) {
    setSlots((prev) => {
      const next = { ...prev };
      delete next[String(position)];
      return next;
    });
  }

  function handleSave() {
    if (!slotsComplete) {
      toast(strings.predictions.fillAllSlots, "error");
      return;
    }
    if (!hasDisplayName && !name.trim()) {
      toast(strings.predictions.nameRequired, "error");
      return;
    }

    const payload: Record<string, string> = {};
    for (const p of positions) payload[String(p)] = slots[String(p)];

    startTransition(async () => {
      const result = await savePrediction({
        raceId,
        type: positionTypeFor(kind, mode),
        payload,
        displayName: name.trim() || undefined,
      });

      if (!result.ok) {
        toast(result.error, "error");
        return;
      }

      // Race form also persists the (optional) DNF pick.
      const dnfPayload = dnfSelectionToPayload(dnf);
      if (kind === "race" && dnfPayload) {
        const dnfResult = await savePrediction({
          raceId,
          type: "race_dnf",
          payload: dnfPayload,
        });
        if (!dnfResult.ok) {
          toast(dnfResult.error, "error");
          return;
        }
      }

      toast(strings.predictions.saved, "success");
    });
  }

  const shareText = (() => {
    const lines: string[] = [
      kind === "qualifying"
        ? strings.share.qualifyingHeader
        : strings.share.raceHeader,
    ];
    const picked = positions.filter((p) => slots[String(p)]);
    for (const p of picked) {
      const d = driverMap.get(slots[String(p)]);
      if (d) lines.push(`${p}. ${d.firstName} ${d.lastName}`);
    }
    if (kind === "race") {
      if (dnf?.kind === "all") lines.push(strings.share.allFinish);
      else if (dnf?.kind === "team") {
        const team = teams.find((t) => t.id === dnf.teamId);
        if (team) lines.push(`${strings.share.dnf}: ${team.name}`);
      }
    }
    if (picked.length === 0) lines.push(strings.share.invite);
    return lines.join("\n");
  })();

  return (
    <div className="flex items-start gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
      {!locked && (
        <div className="inline-flex w-fit rounded-md border border-border p-1">
          {(["podium", "top10"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-sm px-4 py-1.5 text-sm font-medium transition-colors",
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "podium"
                ? strings.predictions.podiumMode
                : strings.predictions.top10Mode}
            </button>
          ))}
        </div>
      )}

      {locked && (
        <p className="rounded-md bg-secondary px-4 py-3 text-sm text-muted-foreground">
          {strings.predictions.readOnlyNotice}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {positions.map((position) => (
          <PredictionSlot
            key={position}
            position={position}
            driver={driverMap.get(slots[String(position)]) ?? null}
            readOnly={locked}
            onPick={() => setActiveSlot(position)}
            onClear={() => clearSlot(position)}
          />
        ))}
      </div>

      {kind === "race" && teams.length > 0 && (
        <DnfPicker
          teams={teams}
          value={dnf}
          readOnly={locked}
          onChange={setDnf}
        />
      )}

      {!locked && (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          {!hasDisplayName && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="display-name" className="text-sm font-medium">
                {strings.predictions.displayNameLabel}
              </label>
              <Input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={strings.predictions.displayNamePlaceholder}
                maxLength={40}
              />
            </div>
          )}
          <Button
            size="lg"
            onClick={handleSave}
            disabled={pending}
            className="w-full sm:w-fit"
          >
            {pending ? strings.states.loading : strings.predictions.save}
          </Button>
        </div>
      )}

      <DriverModal
        open={activeSlot != null}
        onOpenChange={(open) => {
          if (!open) setActiveSlot(null);
        }}
        drivers={drivers}
        takenIds={takenIds}
        onSelect={selectDriver}
      />
      </div>
      <ShareButton text={shareText} />
    </div>
  );
}
