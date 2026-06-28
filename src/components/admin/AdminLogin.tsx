"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminLogin } from "@/lib/actions/admin";

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await adminLogin(password);
      if (!result.ok) {
        setError(result.error);
      } else {
        // Re-render the gated layout.
        window.location.reload();
      }
    });
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Admin panel</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "…" : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
