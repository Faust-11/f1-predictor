"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  saveManualResults,
  type ManualResultEntry,
} from "@/lib/actions/admin";
import type { DriverWithTeam } from "@/lib/data/drivers";

interface InitialResult {
  position: number | null;
  dnf?: boolean;
}

interface ManualResultsEditorProps {
  raceId: string;
  kind: "qualifying" | "race";
  drivers: DriverWithTeam[];
  initial: Map<string, InitialResult>;
}

interface RowState {
  position: string;
  dnf: boolean;
}

export function ManualResultsEditor({
  raceId,
  kind,
  drivers,
  initial,
}: ManualResultsEditorProps) {
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const initialState: Record<string, RowState> = {};
    for (const driver of drivers) {
      const existing = initial.get(driver.id);
      initialState[driver.id] = {
        position: existing?.position != null ? String(existing.position) : "",
        dnf: Boolean(existing?.dnf),
      };
    }
    return initialState;
  });
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function update(driverId: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [driverId]: { ...prev[driverId], ...patch } }));
  }

  function handleSave() {
    const entries: ManualResultEntry[] = drivers.map((d) => {
      const row = rows[d.id];
      const pos = row.position.trim() === "" ? null : Number(row.position);
      return {
        driverId: d.id,
        position: pos != null && !Number.isNaN(pos) ? pos : null,
        dnf: kind === "race" ? row.dnf : undefined,
      };
    });

    startTransition(async () => {
      const result = await saveManualResults({ raceId, kind, entries });
      setMessage(result.ok ? result.message ?? "OK" : result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <p className="text-sm font-semibold">
        {kind === "qualifying" ? "Кваліфікація" : "Гонка"}
      </p>
      <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
        {drivers.map((driver) => {
          const row = rows[driver.id];
          return (
            <div key={driver.id} className="contents">
              <span className="self-center truncate text-xs">
                {driver.code} · {driver.lastName}
              </span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={row.position}
                  onChange={(e) => update(driver.id, { position: e.target.value })}
                  className="h-7 w-16 text-xs"
                  placeholder="P"
                />
                {kind === "race" && (
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={row.dnf}
                      onChange={(e) => update(driver.id, { dnf: e.target.checked })}
                    />
                    DNF
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleSave} disabled={pending}>
          {pending ? "…" : "Зберегти"}
        </Button>
        {message && <span className="text-xs text-muted-foreground">{message}</span>}
      </div>
    </div>
  );
}
