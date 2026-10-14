import { zonedToUtc } from "./time";

export interface Interval {
  start: Date;
  end: Date;
}

export interface DayHours {
  openMin: number;
  closeMin: number;
  isClosed: boolean;
}

export interface SlotInput {
  /** Local calendar date in the shop timezone, YYYY-MM-DD */
  date: string;
  timezone: string;
  /** Opening hours for that weekday; null = no hours configured (closed) */
  hours: DayHours | null;
  /** True when the date is a one-off closure (holiday) */
  isHoliday: boolean;
  durationMin: number;
  stepMin: number;
  /** Existing non-cancelled bookings that touch this day */
  busy: Interval[];
  now: Date;
  minLeadMin: number;
}

/** Half-open interval overlap: [a.start, a.end) ∩ [b.start, b.end) ≠ ∅ */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Pure function that lists every bookable start time for one day.
 *
 * A candidate slot is offered when:
 *  - the shop is open that day and the whole service fits before closing,
 *  - it starts at least `minLeadMin` minutes from `now`,
 *  - it does not overlap any existing booking.
 *
 * The database enforces the same no-overlap rule with an exclusion
 * constraint, so this function is about UX; the DB is the source of truth.
 */
export function generateSlots(input: SlotInput): Interval[] {
  const { hours, durationMin, stepMin } = input;
  if (!hours || hours.isClosed || input.isHoliday) return [];
  if (durationMin <= 0 || stepMin <= 0) {
    throw new Error("durationMin and stepMin must be positive");
  }

  const earliest = input.now.getTime() + input.minLeadMin * 60_000;
  const slots: Interval[] = [];

  for (let m = hours.openMin; m + durationMin <= hours.closeMin; m += stepMin) {
    const start = zonedToUtc(input.date, m, input.timezone);
    if (start.getTime() < earliest) continue;
    const slot = { start, end: new Date(start.getTime() + durationMin * 60_000) };
    if (input.busy.some((b) => overlaps(slot, b))) continue;
    slots.push(slot);
  }
  return slots;
}

export function isSlotAvailable(input: SlotInput, start: Date): boolean {
  return generateSlots(input).some((s) => s.start.getTime() === start.getTime());
}
