import { LogIn, LogOut } from "lucide-react";
import Link from "next/link";

import { signInWithGoogle, signOut } from "@/lib/actions/auth";
import { strings } from "@/lib/i18n/strings";
import { getSessionPlayer } from "@/lib/supabase/server";

const iconButton =
  "inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Header control: Google sign-in for guests, name + sign-out for players. */
export async function AuthButton() {
  const player = await getSessionPlayer().catch(() => null);

  if (!player) {
    return (
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value="/" />
        <button type="submit" className={iconButton} aria-label={strings.auth.signIn} title={strings.auth.signIn}>
          <LogIn className="size-4" aria-hidden="true" />
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/profile"
        className="hidden max-w-32 truncate rounded-md px-2 py-1 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:block"
      >
        {player.displayName ?? player.email}
      </Link>
      <form action={signOut}>
        <button type="submit" className={iconButton} aria-label={strings.auth.signOut} title={strings.auth.signOut}>
          <LogOut className="size-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
