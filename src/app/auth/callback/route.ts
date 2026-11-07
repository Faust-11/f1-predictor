import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/redirect";
import { ensurePlayerForAuthUser } from "@/lib/identity";
import { createServerClient } from "@/lib/supabase/server";

/** OAuth callback: exchanges the code for a session and creates the player row. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      try {
        await ensurePlayerForAuthUser(data.user);
        return NextResponse.redirect(`${origin}${next}`);
      } catch {
        // fall through to the error page
      }
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
