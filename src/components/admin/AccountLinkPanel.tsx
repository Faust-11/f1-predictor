"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { linkLegacyPlayer, type PlayerAccountRow } from "@/lib/actions/admin";

function label(p: PlayerAccountRow): string {
  return `${p.displayName ?? "без імені"}${p.email ? ` · ${p.email}` : ""} · прогнозів: ${p.predictions}`;
}

/** Links a legacy (cookie) player to the Google account they signed in with. */
export function AccountLinkPanel({
  legacy,
  google,
}: {
  legacy: PlayerAccountRow[];
  google: PlayerAccountRow[];
}) {
  const [legacyId, setLegacyId] = useState("");
  const [googleId, setGoogleId] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const selectClass =
    "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground";

  function link() {
    setMessage(null);
    startTransition(async () => {
      const result = await linkLegacyPlayer(legacyId, googleId);
      setIsError(!result.ok);
      setMessage(result.ok ? result.message ?? "OK" : result.error);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Прив&apos;язка старих гравців до Google</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {legacy.length === 0 ? (
          <p className="text-sm text-muted-foreground">Усі гравці вже з Google-акаунтами.</p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Старий гравець
              <select className={selectClass} value={legacyId} onChange={(e) => setLegacyId(e.target.value)}>
                <option value="">—</option>
                {legacy.map((p) => (
                  <option key={p.id} value={p.id}>{label(p)}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Google-акаунт
              <select className={selectClass} value={googleId} onChange={(e) => setGoogleId(e.target.value)}>
                <option value="">—</option>
                {google.map((p) => (
                  <option key={p.id} value={p.id}>{label(p)}</option>
                ))}
              </select>
            </label>
            <Button size="sm" disabled={pending || !legacyId || !googleId} onClick={link}>
              Прив&apos;язати
            </Button>
          </div>
        )}
        {message && (
          <p className={isError ? "text-sm text-destructive" : "text-sm text-muted-foreground"} aria-live="polite">
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
