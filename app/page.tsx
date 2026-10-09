import { PomodoroTimer } from "@/components/pomodoro-timer";
import { SessionHistory } from "@/components/session-history";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Pomodoro focus timer</h1>
        <p className="text-sm text-muted-foreground">
          25 minutes of focus, a 5-minute break after, and a running count of what you finished today.
        </p>
      </header>

      <PomodoroTimer />
      <SessionHistory />

      <footer className="pb-4 text-center text-xs text-muted-foreground">
        Your sessions are kept in this browser only — nothing is sent anywhere. Export data for a copy you can carry.
      </footer>
    </main>
  );
}
