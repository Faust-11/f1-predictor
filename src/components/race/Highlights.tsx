import { Card, CardContent } from "@/components/ui/card";
import { strings } from "@/lib/i18n/strings";

interface HighlightsProps {
  videoId: string;
}

export function Highlights({ videoId }: HighlightsProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-3 sm:p-4">
        <p className="text-base font-semibold">{strings.results.highlights}</p>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title={strings.results.highlights}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </CardContent>
    </Card>
  );
}
