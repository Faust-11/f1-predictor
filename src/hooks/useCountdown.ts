"use client";

import { useEffect, useState } from "react";

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isComplete: boolean;
}

function computeParts(target: number, now: number): CountdownParts {
  const totalMs = Math.max(0, target - now);
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
    isComplete: totalMs <= 0,
  };
}

/**
 * Ticking countdown to a target time. Returns null until mounted (avoids
 * SSR/client hydration mismatch — render a skeleton while null).
 */
export function useCountdown(
  target: Date | string | number | null,
): CountdownParts | null {
  const [parts, setParts] = useState<CountdownParts | null>(null);

  useEffect(() => {
    const targetMs =
      target === null
        ? NaN
        : target instanceof Date
          ? target.getTime()
          : typeof target === "number"
            ? target
            : new Date(target).getTime();

    if (Number.isNaN(targetMs)) {
      // Defer to a microtask so we never call setState synchronously in the effect.
      queueMicrotask(() => setParts(null));
      return;
    }

    const update = () => setParts(computeParts(targetMs, Date.now()));
    queueMicrotask(update);
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [target]);

  return parts;
}
