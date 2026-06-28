"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { THEME_COOKIE, USER_ID_COOKIE_MAX_AGE } from "@/lib/constants";
import { strings } from "@/lib/i18n/strings";

/**
 * Light/dark toggle. The current theme lives as a `dark` class on <html>
 * (applied by the server from a cookie), so the button stays stateless —
 * icons swap purely via the `dark:` variant, avoiding any hydration flash.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${USER_ID_COOKIE_MAX_AGE}; samesite=lax`;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={strings.theme.toggle}
      title={strings.theme.toggle}
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </Button>
  );
}
