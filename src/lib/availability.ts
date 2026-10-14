import { and, asc, eq, gt, gte, lt, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { bookings, businessHours, closures, services } from "@/db/schema";
import { config } from "./config";
import { generateSlots, type Interval } from "./slots";
import { addDays, toZonedDateString, weekdayOf, zonedToUtc } from "./time";

export function todayInShop(now = new Date()): string {
  return toZonedDateString(now, config.timezone);
}

/** True when `date` is between today and the end of the booking window. */
export function isWithinBookingWindow(date: string, now = new Date()): boolean {
  const today = todayInShop(now);
  return date >= today && date <= addDays(today, config.bookingWindowDays);
}

export async function getActiveServices() {
  return db
    .select()
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(asc(services.sortOrder), asc(services.name));
}

export async function getActiveService(id: string) {
  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, id), eq(services.isActive, true)))
    .limit(1);
  return service ?? null;
}

/** Bookable dates for the date picker, with closed days flagged. */
export async function getBookableDates(now = new Date()) {
  const today = todayInShop(now);
  const last = addDays(today, config.bookingWindowDays);
  const [hours, holidays] = await Promise.all([
    db.select().from(businessHours),
    db
      .select()
      .from(closures)
      .where(and(gte(closures.date, today), lte(closures.date, last))),
  ]);
  const hoursByDay = new Map(hours.map((h) => [h.weekday, h]));
  const holidaySet = new Set(holidays.map((c) => c.date));

  const dates: { date: string; closed: boolean }[] = [];
  for (let i = 0; i <= config.bookingWindowDays; i++) {
    const date = addDays(today, i);
    const h = hoursByDay.get(weekdayOf(date));
    dates.push({ date, closed: !h || h.isClosed || holidaySet.has(date) });
  }
  return dates;
}

/** Bookings that occupy any part of a local calendar day. */
export async function getBusyIntervals(date: string): Promise<Interval[]> {
  const dayStart = zonedToUtc(date, 0, config.timezone);
  const dayEnd = zonedToUtc(addDays(date, 1), 0, config.timezone);
  return db
    .select({ start: bookings.startsAt, end: bookings.endsAt })
    .from(bookings)
    .where(
      and(ne(bookings.status, "cancelled"), lt(bookings.startsAt, dayEnd), gt(bookings.endsAt, dayStart)),
    );
}

/** Available slots for a service on a date, or [] when closed / outside the window. */
export async function getAvailableSlots(
  service: { durationMin: number },
  date: string,
  now = new Date(),
): Promise<Interval[]> {
  if (!isWithinBookingWindow(date, now)) return [];

  const [[hours], [holiday], busy] = await Promise.all([
    db
      .select()
      .from(businessHours)
      .where(eq(businessHours.weekday, weekdayOf(date)))
      .limit(1),
    db.select().from(closures).where(eq(closures.date, date)).limit(1),
    getBusyIntervals(date),
  ]);

  return generateSlots({
    date,
    timezone: config.timezone,
    hours: hours ?? null,
    isHoliday: Boolean(holiday),
    durationMin: service.durationMin,
    stepMin: config.slotStepMinutes,
    busy,
    now,
    minLeadMin: config.minLeadMinutes,
  });
}
