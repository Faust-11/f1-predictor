import { format, type FormatOptions } from "date-fns";
import { uk } from "date-fns/locale";

const TIME_ZONE = "Europe/Kyiv";

/**
 * Returns a Date whose LOCAL components equal the wall-clock time in Europe/Kyiv.
 * date-fns `format` always reads a Date's local components, so on a UTC server it
 * would otherwise print UTC time. By rebuilding the date from the Kyiv wall-clock
 * parts we make `format` render Kyiv time everywhere (server, cron, any browser),
 * and DST (літній/зимовий час) is handled automatically by Intl.
 */
function toKyivWallClock(value: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);

  const get = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  let hour = get("hour");
  if (hour === 24) hour = 0; // some runtimes emit "24" at midnight

  return new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  );
}

export function formatDateUk(
  date: Date | string | number,
  pattern: string,
  options?: Omit<FormatOptions, "locale">,
): string {
  const value =
    typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return format(toKyivWallClock(value), pattern, { locale: uk, ...options });
}
