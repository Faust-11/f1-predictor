import Link from "next/link";

import { Navbar } from "@/components/layout/Navbar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { strings } from "@/lib/i18n/strings";

/** Original F1-inspired wordmark (no official brand assets). */
function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label={strings.app.title}>
      <span className="flex h-7 items-center rounded-sm bg-primary px-1.5 font-heading text-base font-bold italic leading-none text-primary-foreground">
        F1
      </span>
      <span className="font-heading text-base font-bold tracking-tight">
        Predictor
      </span>
    </Link>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <div className="flex items-center gap-1">
          <Navbar />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
