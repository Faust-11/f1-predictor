"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { flagUrl } from "@/lib/country-flag";
import type { BioPayload } from "@/lib/data/bio";
import { strings } from "@/lib/i18n/strings";

export interface BioSubject {
  type: "driver" | "constructor";
  /** Driver code (e.g. "VER") — required for drivers. */
  code?: string;
  name: string;
  teamColor?: string | null;
  photoUrl?: string | null;
  /** Extra header line, e.g. the driver's team name. */
  subtitle?: string;
}

// Session-wide cache so reopening a bio never refetches.
const bioCache = new Map<string, BioPayload>();

function bioKey(subject: BioSubject): string {
  return subject.type === "driver"
    ? `driver:${subject.code ?? ""}`
    : `constructor:${subject.name}`;
}

function bioUrl(subject: BioSubject): string {
  return subject.type === "driver"
    ? `/api/bio?type=driver&code=${encodeURIComponent(subject.code ?? "")}`
    : `/api/bio?type=constructor&name=${encodeURIComponent(subject.name)}`;
}

function formatBorn(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  const formatted = new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  const age = Math.floor(
    (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );
  return `${formatted} (${age})`;
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-md bg-secondary/60 px-2 py-2.5 text-center">
      <span className="font-heading text-lg font-bold tabular-nums">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

interface BioDialogProps {
  subject: BioSubject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BioDialog({ subject, open, onOpenChange }: BioDialogProps) {
  const key = subject ? bioKey(subject) : null;
  const cached = key ? bioCache.get(key) : undefined;
  const [result, setResult] = useState<{
    key: string;
    data: BioPayload | null;
  }>();

  useEffect(() => {
    if (!open || !subject) return;
    const k = bioKey(subject);
    if (bioCache.has(k)) return;
    let cancelled = false;
    fetch(bioUrl(subject))
      .then((r) => (r.ok ? (r.json() as Promise<BioPayload>) : null))
      .then((data) => {
        if (data) bioCache.set(k, data);
        if (!cancelled) setResult({ key: k, data });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: k, data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [open, subject]);

  // undefined = loading, null = failed.
  const data = cached ?? (result?.key === key ? result.data : undefined);
  const s = strings.bio;

  const winsTile =
    data && data.wins === 0 && data.bestFinish != null
      ? { label: s.bestFinish, value: `P${data.bestFinish}` }
      : { label: s.wins, value: data?.wins ?? 0 };
  const polesTile =
    data && data.poles === 0 && data.bestGrid != null
      ? { label: s.bestGrid, value: `P${data.bestGrid}` }
      : { label: s.poles, value: data?.poles ?? 0 };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 pr-8">
            {subject?.type === "driver" ? (
              <Avatar
                className="size-12 shrink-0"
                style={
                  subject.teamColor
                    ? { boxShadow: `0 0 0 2px ${subject.teamColor}` }
                    : undefined
                }
              >
                {subject.photoUrl && (
                  <AvatarImage src={subject.photoUrl} alt={subject.name} />
                )}
                <AvatarFallback>{subject.code ?? "?"}</AvatarFallback>
              </Avatar>
            ) : (
              <span
                className="h-10 w-1.5 shrink-0 rounded-full bg-border"
                style={
                  subject?.teamColor
                    ? { backgroundColor: subject.teamColor }
                    : undefined
                }
              />
            )}
            <div className="min-w-0">
              <DialogTitle className="truncate">{subject?.name}</DialogTitle>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {data?.countryIso && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={flagUrl(data.countryIso)}
                    alt=""
                    width={14}
                    height={14}
                    loading="lazy"
                    className="size-3.5 shrink-0 rounded-full"
                  />
                )}
                <span className="truncate">
                  {[data?.nationality, subject?.subtitle]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {data === undefined ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : data === null ? (
            <p className="text-sm text-muted-foreground">{s.error}</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2">
                <StatTile label={winsTile.label} value={winsTile.value} />
                <StatTile label={polesTile.label} value={polesTile.value} />
                <StatTile label={s.championships} value={data.championships} />
              </div>
              {data.born && (
                <p className="text-sm">
                  <span className="text-muted-foreground">{s.born}: </span>
                  {formatBorn(data.born)}
                </p>
              )}
              {data.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {data.description}
                </p>
              )}
              {data.wikiUrl && (
                <a
                  href={data.wikiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {s.wiki}
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
