"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { updateDisplayName } from "@/lib/actions/profile";
import { strings } from "@/lib/i18n/strings";

export function ProfileForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    if (!name.trim()) {
      toast(strings.predictions.nameRequired, "error");
      return;
    }
    startTransition(async () => {
      const result = await updateDisplayName(name);
      if (result.ok) {
        toast(strings.profile.saved, "success");
      } else {
        toast(result.error, "error");
      }
    });
  }

  return (
    <div className="flex max-w-md flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-name" className="text-sm font-medium">
          {strings.profile.displayName}
        </label>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={strings.profile.placeholder}
          maxLength={40}
        />
      </div>
      <p className="text-sm text-muted-foreground">{strings.profile.description}</p>
      <Button
        onClick={handleSave}
        disabled={pending}
        size="lg"
        className="w-fit"
      >
        {pending ? strings.states.loading : strings.profile.save}
      </Button>
    </div>
  );
}
