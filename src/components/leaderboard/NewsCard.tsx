"use client";

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import type { NewsSource } from "@/lib/data/news";
import { formatDateUk } from "@/lib/i18n/date";
import { strings } from "@/lib/i18n/strings";
import { cn } from "@/lib/utils";

interface NewsCardProps {
  sources: NewsSource[];
}

export function NewsCard({ sources }: NewsCardProps) {
  const available = sources.filter((s) => s.items.length > 0);
  const [activeId, setActiveId] = useState(available[0]?.id ?? "");
  const active = available.find((s) => s.id === activeId) ?? available[0];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="inline-flex w-fit flex-wrap gap-1 rounded-lg bg-secondary p-1">
          {available.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active?.id === s.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>

        {!active || active.items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {strings.news.empty}
          </p>
        ) : (
          <ul className="flex flex-col">
            {active.items.map((item) => (
              <li
                key={item.link}
                className="border-b border-border/60 py-3 last:border-0"
              >
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-3"
                >
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt=""
                      loading="lazy"
                      className="h-14 w-20 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium group-hover:text-primary">
                      {item.title}
                    </p>
                    {item.summary && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {item.summary}
                      </p>
                    )}
                    {item.publishedAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateUk(item.publishedAt, "d MMM, HH:mm")}
                      </p>
                    )}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
