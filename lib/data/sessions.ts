/**
 * This app's queries. Components call these, never Dexie directly.
 */
import { localDateString } from "@/lib/dates";
import { database, newId, type FocusSession } from "@/lib/db";

const sessions = async () => (await database.ready()).sessions;

/** Every finished focus session, oldest last. Small table — one row per pomodoro ever finished. */
export async function listSessions(): Promise<FocusSession[]> {
  return (await sessions()).orderBy("completedAt").toArray();
}

/** Record one finished focus session under the local calendar date it finished on. */
export async function recordSession(completedAt: number): Promise<void> {
  await (await sessions()).add({ id: newId(), date: localDateString(new Date(completedAt)), completedAt });
}

/** Remove every recorded session. "Clear history" — there is no undo, so the UI confirms first. */
export async function clearSessions(): Promise<void> {
  await (await sessions()).clear();
}
