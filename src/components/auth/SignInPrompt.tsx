import { LogIn } from "lucide-react";

import { signInWithGoogle } from "@/lib/actions/auth";
import { strings } from "@/lib/i18n/strings";

/** Card asking a guest to sign in with Google; returns to `next` afterwards. */
export function SignInPrompt({ next }: { next: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border p-4 sm:p-6">
      <p className="text-sm text-muted-foreground">{strings.auth.signInPrompt}</p>
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <LogIn className="size-4" aria-hidden="true" />
          {strings.auth.signIn}
        </button>
      </form>
    </div>
  );
}
