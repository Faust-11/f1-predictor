/**
 * Only same-site relative paths are allowed as post-login redirects
 * (prevents open redirects like `?next=//evil.example`).
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next;
}
