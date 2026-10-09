"use client";

/**
 * The pomodoro timer itself.
 *
 * The countdown is measured against a timestamp, not a tick counter: while running, the state
 * holds the moment the phase ends (`endAt`), and every tick recomputes the remainder from
 * `Date.now()`. A browser throttles or suspends `setInterval` in a hidden tab all it likes —
 * the readout loses nothing, and a session that ends while the tab is hidden completes the
 * moment any tick (or the tab's return) catches up with real time.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { database } from "@/lib/db";
import { listSessions, recordSession } from "@/lib/data/sessions";
import { playChime } from "@/lib/sound";
import { useStoredQuery } from "@/lib/storage/react";
import { useToday } from "@/lib/use-today";
import { setMuted, unlockAudio, useAudioStatus } from "@/lib/audio";

export const FOCUS_MS = 25 * 60 * 1000;
export const BREAK_MS = 5 * 60 * 1000;

type Phase = "focus" | "break";
type Status = "idle" | "running" | "paused";

type TimerState = {
  phase: Phase;
  status: Status;
  /** Milliseconds left in the phase. While running, recomputed from `endAt` on every tick. */
  remainingMs: number;
  /** Epoch millis at which the running phase ends. 0 while not running. */
  endAt: number;
};

type TimerAction =
  | { type: "toggle"; now: number }
  | { type: "tick"; now: number }
  | { type: "complete" }
  | { type: "reset" };

const initialState: TimerState = { phase: "focus", status: "idle", remainingMs: FOCUS_MS, endAt: 0 };

/** The state after the running phase ends: the other phase, idle, at its full length. */
function nextPhaseState(state: TimerState): TimerState {
  return state.phase === "focus"
    ? { phase: "break", status: "idle", remainingMs: BREAK_MS, endAt: 0 }
    : { phase: "focus", status: "idle", remainingMs: FOCUS_MS, endAt: 0 };
}

function reducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case "toggle":
      if (state.status === "running") {
        return { ...state, status: "paused", remainingMs: Math.max(0, state.endAt - action.now) };
      }
      // Starting from idle or from a pause: run from whatever is left, not from the full length.
      return { ...state, status: "running", endAt: action.now + state.remainingMs };
    case "tick": {
      if (state.status !== "running") return state;
      const remaining = state.endAt - action.now;
      // The tick callback completes overdue phases itself (its side effects cannot run in the
      // reducer); it shares the same `now`, so this branch means the callback will see it too.
      return remaining > 0 ? { ...state, remainingMs: remaining } : nextPhaseState(state);
    }
    case "complete":
      // A second "complete" (a tick racing a reset) is a no-op, so state and mirror agree.
      return state.status === "running" ? nextPhaseState(state) : state;
    case "reset":
      // Whether running or paused, in focus or in break: back to a fresh 25:00 focus session.
      return { ...initialState };
  }
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PomodoroTimer() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // The mirror the tick callback reads: dispatches from outside React render only after a
  // re-render, so the mirror is advanced by hand the moment the callback completes a phase.
  const stateRef = useRef(state);
  stateRef.current = state;

  const today = useToday();
  const { data: sessions } = useStoredQuery(database, listSessions);

  // Sound state. `unlockAudio` runs inside the Start handler — a browser only lets a user
  // gesture resume the shared AudioContext, so the chime can play when a phase ends later.
  const audioStatus = useAudioStatus();
  const [muted, setMutedState] = useState(false);

  const announceCompletion = useCallback((phase: Phase) => {
    playChime();
    if (phase === "focus") {
      toast.success("Focus session finished — time for a 5-minute break.");
      recordSession(Date.now()).catch((error: unknown) => {
        toast.error(`Could not save the session: ${error instanceof Error ? error.message : "unknown error"}`);
      });
    } else {
      toast.success("Break finished — time for the next focus session.");
    }
  }, []);

  const tick = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== "running") return;
    const now = Date.now();
    if (current.endAt - now > 0) {
      dispatch({ type: "tick", now });
      return;
    }
    // Overdue: the phase really ended, however long ago. Advance the mirror before dispatching
    // so a second tick before the re-render cannot announce the same completion twice.
    stateRef.current = reducer(current, { type: "complete" });
    dispatch({ type: "complete" });
    announceCompletion(current.phase);
  }, [announceCompletion]);

  // One interval while running, plus an immediate recomputation when the tab comes back — the
  // readout is always derived from `endAt`, so it can only ever be late, never wrong.
  const isRunning = state.status === "running";
  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(tick, 250);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isRunning, tick]);

  // Keyboard: Space starts or pauses, R resets. When the keystroke lands on a button or other
  // control, that control's own activation handles it — which is exactly what keeps Space on a
  // focused Start button from toggling twice — and a dialog (like Clear history) owns the keys
  // while it is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("button, a, input, select, textarea, [role='button'], [role='dialog'], [contenteditable=''], [contenteditable='true']")
      ) {
        return;
      }
      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        dispatch({ type: "toggle", now: Date.now() });
      } else if (event.code === "KeyR" || event.key === "r" || event.key === "R") {
        event.preventDefault();
        dispatch({ type: "reset" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggle = () => {
    void unlockAudio();
    dispatch({ type: "toggle", now: Date.now() });
  };

  const reset = () => dispatch({ type: "reset" });

  const handleSoundButton = async () => {
    if (audioStatus === "suspended") {
      // The context exists but the browser silenced it; this click is the gesture it needs.
      await unlockAudio();
      return;
    }
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  };

  const phaseLabel = state.phase === "focus" ? "Focus" : "Break";
  const phaseLength = state.phase === "focus" ? FOCUS_MS : BREAK_MS;
  const progress = Math.min(1, Math.max(0, 1 - state.remainingMs / phaseLength));
  const buttonLabel = state.status === "running" ? "Pause" : state.status === "paused" ? "Resume" : "Start";

  const todaySessions = useMemo(
    () => (sessions && today ? sessions.filter((session) => session.date === today).length : null),
    [sessions, today],
  );

  const soundStatus = audioStatus === "unsupported"
    ? "Sound is not available in this browser."
    : audioStatus === "suspended"
      ? "Sound is paused. Press Enable sound to resume it."
      : muted
        ? "Sound is off. The chime will not play."
        : "A soft chime plays when a session or break ends.";

  const soundButtonLabel = audioStatus === "suspended" ? "Enable sound" : muted ? "Unmute sound" : "Mute sound";

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <CardTitle className="sr-only">Pomodoro timer</CardTitle>
        <CardDescription>25 minutes of focus, then a 5-minute break.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        <Badge aria-live="polite" className="px-4 py-1 text-sm" variant={state.phase === "focus" ? "default" : "secondary"}>
          {phaseLabel}
        </Badge>

        <div
          role="timer"
          aria-label={`${phaseLabel} time remaining`}
          className="text-8xl font-semibold tabular-nums tracking-tight"
        >
          {formatCountdown(state.remainingMs)}
        </div>

        <div
          className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`${phaseLabel} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="flex w-full max-w-xs gap-3">
          <Button size="lg" className="h-12 flex-1 text-base" onClick={toggle}>
            {buttonLabel}
          </Button>
          <Button size="lg" variant="outline" className="h-12 flex-1 text-base" onClick={reset}>
            Reset
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Space starts or pauses, R resets. Buttons work with Tab and Enter too.
        </p>

        <div className="flex w-full max-w-xs items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">{soundStatus}</span>
          <Button variant="ghost" size="sm" className="h-9 shrink-0" onClick={() => void handleSoundButton()}>
            {soundButtonLabel}
          </Button>
        </div>

        <div className="w-full border-t pt-4 text-center" aria-live="polite">
          {todaySessions === null ? (
            <>
              <Skeleton className="mx-auto h-8 w-24" />
              <span className="sr-only">Loading today&apos;s session count</span>
            </>
          ) : (
            <p className="text-2xl font-semibold">
              <span className="tabular-nums">{todaySessions}</span>{" "}
              <span className="text-base font-normal text-muted-foreground">
                {todaySessions === 1 ? "session today" : "sessions today"}
              </span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
