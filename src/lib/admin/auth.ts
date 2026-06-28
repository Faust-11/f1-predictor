import { cookies } from "next/headers";

import { ADMIN_COOKIE } from "@/lib/constants";

/** True when the admin cookie matches the configured ADMIN_PASSWORD. */
export async function isAdminAuthenticated(): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;

  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === password;
}
