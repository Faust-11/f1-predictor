// Manually curated YouTube video IDs for official F1 race highlights, keyed by
// race round (the number shown on the race card).
//
// To add one: take the id from the YouTube URL — youtube.com/watch?v=<THIS_PART>
// — and add a line like:  8: "dQw4w9WgXcQ",   // Austrian GP
export const RACE_HIGHLIGHTS: Record<number, string> = {
  // round: "videoId",
};

export function highlightVideoId(round: number): string | null {
  return RACE_HIGHLIGHTS[round] ?? null;
}
