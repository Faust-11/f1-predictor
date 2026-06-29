import { createHmac } from "node:crypto";
import { cookies } from "next/headers";

import { ADMIN_COOKIE } from "@/lib/constants";

/**
 * Derived session token stored in the admin cookie — an HMAC keyed by
 * ADMIN_PASSWORD, so the cookie never holds the password itself.
 */
export function adminSessionToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHmac("sha256", password)
    .update("f1-admin-session")
    .digest("hex");
}

/** True when the admin cookie matches the derived session token. */
export async function isAdminAuthenticated(): Promise<boolean> {
  const token = adminSessionToken();
  if (!token) return false;

  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === token;
}
