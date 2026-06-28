"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runAdminSync } from "@/lib/actions/admin";
import type { SyncScope } from "@/lib/api/normalized";

const SCOPES: SyncScope[] = ["calendar", "roster", "results", "full"];

export function SyncPanel() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function run(scope: SyncScope) {
    setMessage(null);
    startTransition(async () => {
      const result = await runAdminSync(scope);
      setIsError(!result.ok);
      setMessage(result.ok ? result.message ?? "OK" : result.error);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Синхронізація</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {SCOPES.map((scope) => (
            <Button
              key={scope}
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(scope)}
            >
              <RefreshCw className="size-3.5" />
              {scope}
            </Button>
          ))}
        </div>
        {message && (
          <p
            className={
              isError ? "text-sm text-destructive" : "text-sm text-muted-foreground"
            }
          >
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
