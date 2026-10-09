/**
 * Local calendar dates. The daily count of sessions and the 7-day history are both keyed by the
 * visitor's own calendar day — never by dividing epoch millis by 86_400_000, which skips and
 * repeats days across midnight and daylight-saving changes.
 */

/** The local calendar date of a moment, as `YYYY-MM-DD`. */
export function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** A Date at local midnight `offset` calendar days before `from` (0 = `from`'s own day). */
export function dayOffset(from: Date, offset: number): Date {
  return new Date(from.getFullYear(), from.getMonth(), from.getDate() - offset);
}

/** Short English weekday, for chart axes and table rows. Fixed, so server and client agree. */
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function weekdayLabel(date: Date): string {
  return WEEKDAYS[date.getDay()];
}

/** `Mar 3` — a month and day that reads the same whether it is this year or not. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function shortDateLabel(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** The local date `YYYY-MM-DD` of the calendar day before the one given. */
export function previousDateString(today: string): string {
  const [year, month, day] = today.split("-").map(Number);
  return localDateString(new Date(year!, month! - 1, day! - 1));
}

/** `today` / `yesterday` / a short date, for the history table's first column. */
export function dayLabel(date: Date, today: string): string {
  const label = localDateString(date);
  if (label === today) return "Today";
  if (label === previousDateString(today)) return "Yesterday";
  return shortDateLabel(date);
}
