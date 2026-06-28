"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { strings } from "@/lib/i18n/strings";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: strings.nav.home },
  { href: "/calendar", label: strings.nav.calendar },
  { href: "/leaderboard", label: strings.nav.leaderboard },
  { href: "/history", label: strings.nav.history },
  { href: "/profile", label: strings.nav.profile },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden items-center gap-1 md:flex">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive(pathname, link.href)
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label={open ? strings.nav.closeMenu : strings.nav.openMenu}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {/* Mobile menu */}
      {open && (
        <div className="absolute inset-x-0 top-full z-40 flex flex-col gap-1 border-b border-border bg-background p-3 shadow-md md:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(pathname, link.href)
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
