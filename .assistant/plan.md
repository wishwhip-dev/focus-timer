# Plan

Goal: A pomodoro focus timer: Start, pause and reset a 25-minute session, a short break after, a soft chime when a session ends, and a daily count of finished sessions that survives a reload. Comfortable to use on a phone.

1. Opening the home page at / shows a focus timer: a large readout of the remaining time in mm:ss starting at 25:00, a mode label reading 'Focus', and a Start button with that visible text — usable from the home page with no navigation or URL parameters
2. Pressing Start begins counting down from 25:00, the readout ticks down every second, and the same button becomes Pause, which freezes the countdown; pressing it again resumes from where it stopped
3. A Reset button labelled 'Reset' returns the timer to 25:00 with mode 'Focus' and stops the countdown at any point, whether running or paused and whether in focus or in break; after a reset, Start always begins a fresh 25:00 focus session
4. With the timer running, switching to another tab for a minute and returning shows a remaining time that reflects the elapsed real time (measured against a timestamp, not a throttled tick counter), and the readout does not skip or stall when the tab is hidden
5. When the focus countdown reaches 0:00 a soft chime plays through the shared Web Audio context from lib/audio.ts, a toast announces the session is finished, the mode label changes to 'Break', and the timer switches to a short break of 5:00 which the same Start button then runs
6. When the break countdown reaches 0:00 the chime plays again, a toast announces the break is over, and the timer returns to 25:00 focus ready for the next session
7. Each completed focus session increments a daily count shown on the page as a readout, such as '3 sessions today', that updates immediately when the session ends without a reload and resets to 0 at the start of a new calendar day
8. The day's completed sessions are recorded in the Dexie database — one row per finished session with the date — and after finishing a session and reloading the page, both the today count and the record are still there
9. Reloading the page mid-session returns the timer to 25:00 Focus (an unfinished session is not remembered) while the today count, history chart and table keep every previously finished session
10. A history section shows a bar chart of sessions completed per day over the last 7 days using the themed chart component, plus a table listing recent days with their session counts; today's bar appears even when it has zero sessions, and with no sessions at all it shows a clear 'no sessions yet' message
11. The timer can be operated from the keyboard: Space toggles start and pause and R resets, activatable by Tab and Enter, and pressing Space when the Start button itself has focus does not trigger the toggle twice
12. The layout fits a phone-sized screen around 375px wide: the timer readout, buttons, count and chart all stack vertically with no horizontal scrolling and touch-sized buttons
13. A 'Clear history' control labelled as destructive removes all recorded sessions, and the chart, table and today count then show zero
14. The app name and description in app/identity.ts are rewritten to describe the pomodoro focus timer, so the browser tab title matches the app

These are the outcomes this task is judged against.