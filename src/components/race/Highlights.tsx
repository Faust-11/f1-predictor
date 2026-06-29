import { Play } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { strings } from "@/lib/i18n/strings";

interface HighlightsProps {
  videoId: string;
}

// Official F1 (FOM) highlights are embed-blocked by the content owner, so we
// show a thumbnail that opens the video on YouTube instead of an inline player.
export function Highlights({ videoId }: HighlightsProps) {
  const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-3 sm:p-4">
        <p className="text-base font-semibold">{strings.results.highlights}</p>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-black"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnail}
            alt={strings.results.highlights}
            loading="lazy"
            className="h-full w-full object-cover transition-opacity group-hover:opacity-80"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-black/60 text-white transition-colors group-hover:bg-primary">
              <Play className="size-7 translate-x-0.5 fill-current" />
            </span>
          </span>
        </a>
      </CardContent>
    </Card>
  );
}
