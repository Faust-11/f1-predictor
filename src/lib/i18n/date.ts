import { format, type FormatOptions } from "date-fns";
import { uk } from "date-fns/locale";

export function formatDateUk(
  date: Date | string | number,
  pattern: string,
  options?: Omit<FormatOptions, "locale">,
): string {
  const value =
    typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return format(value, pattern, { locale: uk, ...options });
}
