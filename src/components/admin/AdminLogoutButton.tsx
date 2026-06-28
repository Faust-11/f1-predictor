"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { adminLogout } from "@/lib/actions/admin";

export function AdminLogoutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => adminLogout())}
    >
      <LogOut className="size-4" />
      Logout
    </Button>
  );
}
