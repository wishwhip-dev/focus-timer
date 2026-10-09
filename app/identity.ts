/**
 * What this app is called and how it looks when shared: the page title, the description search
 * engines and link previews show, the colour of the icon and the browser bar, and the letter on
 * the icon. The layout, the icons, the manifest and the share image all read from here, so a
 * change here reaches every one of them. Keep `name` short and `description` one plain sentence.
 */
export const identity = {
  name: "Pomodoro Focus Timer",
  description:
    "A pomodoro timer that runs 25-minute focus sessions with 5-minute breaks, a soft chime at each end, and a daily count of finished sessions kept in your browser.",
  accent: "#c2410c",
  initial: "P",
} as const;
