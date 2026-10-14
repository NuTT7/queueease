/**
 * Timezone helpers built on Intl only (no date library).
 *
 * The shop works in a single IANA timezone. All timestamps are stored in UTC
 * (timestamptz) and converted to the shop's wall-clock time for display and
 * for interpreting business hours such as "10:00–20:00".
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** UTC offset of `tz` at instant `at`, in minutes (Asia/Bangkok → 420). */
export function tzOffsetMinutes(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "longOffset",
  }).formatToParts(at);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = name.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0; // "GMT" exactly means UTC
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

/**
 * Convert a wall-clock time in `tz` to a UTC Date.
 * `minutes` is minutes after local midnight of `date` (may exceed 1440).
 * Handles DST by re-checking the offset at the computed instant.
 */
export function zonedToUtc(date: string, minutes: number, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const asIfUtc = Date.UTC(y, m - 1, d, 0, minutes);
  const firstOffset = tzOffsetMinutes(tz, new Date(asIfUtc));
  let ts = asIfUtc - firstOffset * 60_000;
  const secondOffset = tzOffsetMinutes(tz, new Date(ts));
  if (secondOffset !== firstOffset) ts = asIfUtc - secondOffset * 60_000;
  return new Date(ts);
}

/** The calendar date (YYYY-MM-DD) of instant `at` in `tz`. */
export function toZonedDateString(at: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** "HH:mm" in `tz` */
export function formatTime(at: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

/** e.g. "จันทร์ 12 ต.ค. 2569" */
export function formatThaiDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hhmmToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 24 || m > 59 || (h === 24 && m !== 0)) return null;
  return h * 60 + m;
}

export const THAI_WEEKDAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
