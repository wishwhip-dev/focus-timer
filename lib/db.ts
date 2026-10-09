/**
 * This application's database.
 *
 * The reusable half of the setup is in `lib/storage/` and is not edited. This file is the half
 * that describes the product: which tables exist, what is indexed, how the schema has changed over
 * time, and what a first visit starts with.
 *
 * The pomodoro timer records one row per finished focus session. Breaks are not recorded — the
 * daily count and the history chart both count focus sessions only. There is no seed: an empty
 * history is the honest first-run state for a timer, and the history section says so.
 */
import { defineDatabase } from "@/lib/storage/database";

/** One finished focus session. */
export type FocusSession = {
  id: string;
  /** Local calendar date the session finished on, `YYYY-MM-DD`. Indexed, because every query filters by it. */
  date: string;
  /** Epoch millis when the session ended. Indexed, because the table is read in this order. */
  completedAt: number;
};

/** Ids are generated here so the data layer never depends on an auto-increment round trip. */
export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const database = defineDatabase<{ sessions: FocusSession }>({
  // Part of the origin's storage identity. Renaming it does not migrate anything — it points the
  // application at a different, empty database and abandons the old one in place. That is exactly
  // what you want on a first build, and never what you want afterwards.
  name: "pomodoro-focus-timer",
  versions: [
    // Only the primary key and the properties queried on. `completedAt` is ordered by, `date` is
    // filtered by; nothing else about a session needs an index.
    { version: 1, stores: { sessions: "id, date, completedAt" } },
  ],
});
