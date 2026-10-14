import type { BookingStatus } from "@/db/schema";
import { config } from "./config";

/** Customers may cancel online only while confirmed and before the cutoff. */
export function canCustomerCancel(
  booking: { status: BookingStatus; startsAt: Date },
  now: Date = new Date(),
): boolean {
  return (
    booking.status === "confirmed" &&
    booking.startsAt.getTime() - now.getTime() >= config.cancelCutoffMinutes * 60_000
  );
}
