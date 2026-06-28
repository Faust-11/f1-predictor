"use client";

import { useState } from "react";

interface TrackOutlineProps {
  src: string;
  className?: string;
}

/**
 * Renders a circuit layout image (public/tracks/<round>.svg).
 * Hides itself if the file is missing, so cards degrade gracefully.
 * `dark:invert` flips dark-on-transparent outlines to light on the dark theme.
 */
export function TrackOutline({ src, className }: TrackOutlineProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
