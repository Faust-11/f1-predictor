import type { Metadata } from "next";

import { CalendarGrid } from "@/components/race/CalendarGrid";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { getRaces } from "@/lib/data/races";
import { strings } from "@/lib/i18n/strings";
import type { Race } from "@/types/race";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: strings.pages.calendar,
};

export default async function CalendarPage() {
  let races: Race[];
  try {
    races = await getRaces();
  } catch {
    return <ErrorState />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">
        {strings.pages.calendar}
      </h1>
      {races.length > 0 ? (
        <CalendarGrid races={races} />
      ) : (
        <EmptyState message={strings.states.calendarEmpty} />
      )}
    </div>
  );
}
