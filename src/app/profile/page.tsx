import type { Metadata } from "next";

import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ErrorState } from "@/components/shared/ErrorState";
import { getCurrentUser } from "@/lib/data/user";
import { strings } from "@/lib/i18n/strings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: strings.pages.profile,
};

export default async function ProfilePage() {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch {
    return <ErrorState />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">
        {strings.profile.title}
      </h1>
      {user ? (
        <>
          <p className="text-sm text-muted-foreground">
            {strings.auth.email}: <span className="text-foreground">{user.email}</span>
          </p>
          <ProfileForm initialName={user.displayName ?? ""} />
        </>
      ) : (
        <SignInPrompt next="/profile" />
      )}
    </div>
  );
}
