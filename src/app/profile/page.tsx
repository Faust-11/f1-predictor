import type { Metadata } from "next";

import { ProfileForm } from "@/components/profile/ProfileForm";
import { ErrorState } from "@/components/shared/ErrorState";
import { getCurrentUser } from "@/lib/data/user";
import { strings } from "@/lib/i18n/strings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: strings.pages.profile,
};

export default async function ProfilePage() {
  let initialName = "";
  try {
    const user = await getCurrentUser();
    initialName = user?.displayName ?? "";
  } catch {
    return <ErrorState />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">
        {strings.profile.title}
      </h1>
      <ProfileForm initialName={initialName} />
    </div>
  );
}
