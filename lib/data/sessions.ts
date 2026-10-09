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
  const table = await sessions();
  await table.add({ id: newId(), date: localDateOf(completedAt), completedAt });
}

/** Remove every recorded session. "Clear history" — there is no undo, so the UI confirms first. */
export async function clearSessions(): Promise<void> {
  await (await sessions()).clear();
}

/** The epoch millis → local `YYYY-MM-DD` conversion, kept with the queries that depend on it. */
function localDateOf(epochMs: number): string {
  const date = new Date(epochMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
