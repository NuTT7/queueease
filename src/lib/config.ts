function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const config = {
  shopName: process.env.SHOP_NAME ?? "QueueEase",
  timezone: process.env.SHOP_TIMEZONE ?? "Asia/Bangkok",
  /** Granularity of offered start times, e.g. 15 → 10:00, 10:15, 10:30 */
  slotStepMinutes: intEnv("SLOT_STEP_MINUTES", 15) || 15,
  /** How many days ahead customers may book (today counts as day 0) */
  bookingWindowDays: intEnv("BOOKING_WINDOW_DAYS", 14),
  /** Customers cannot book a slot starting sooner than this */
  minLeadMinutes: intEnv("MIN_LEAD_MINUTES", 60),
  /** Customers cannot cancel online later than this before the start */
  cancelCutoffMinutes: intEnv("CANCEL_CUTOFF_MINUTES", 120),
};
