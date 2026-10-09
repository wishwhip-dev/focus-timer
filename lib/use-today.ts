"use client";

import { useSyncExternalStore } from "react";
import { localDateString } from "@/lib/dates";
import { useIsHydrated } from "@/lib/storage/react";

/**
 * Today's local calendar date as `YYYY-MM-DD`, or `null` before hydration — the server renders no
 * date at all, because its "today" may not be the visitor's.
 *
 * The snapshot is re-read when the tab becomes visible and every half minute, so a page left open
 * across midnight rolls over to the new day without a reload. Strings compare by value, so the
 * snapshot changing only at midnight is what stops the re-renders.
 */
function subscribeToDay(onChange: () => void): () => void {
  const interval = window.setInterval(onChange, 30_000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onChange);
  };
}

export function useToday(): string | null {
  const hydrated = useIsHydrated();
  const today = useSyncExternalStore(subscribeToDay, () => localDateString(new Date()), () => "");
  return hydrated ? today || null : null;
}
