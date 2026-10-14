import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const bookingStatus = pgEnum("booking_status", ["confirmed", "completed", "cancelled", "no_show"]);
export type BookingStatus = (typeof bookingStatus.enumValues)[number];

export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    durationMin: integer("duration_min").notNull(),
    priceSatang: integer("price_satang").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("services_duration_positive", sql`${t.durationMin} > 0 AND ${t.durationMin} <= 720`),
    check("services_price_non_negative", sql`${t.priceSatang} >= 0`),
  ],
);

/** One row per weekday (0 = Sunday). Times are minutes after local midnight. */
export const businessHours = pgTable(
  "business_hours",
  {
    weekday: smallint("weekday").primaryKey(),
    openMin: integer("open_min").notNull(),
    closeMin: integer("close_min").notNull(),
    isClosed: boolean("is_closed").notNull().default(false),
  },
  (t) => [
    check("business_hours_weekday_range", sql`${t.weekday} BETWEEN 0 AND 6`),
    check(
      "business_hours_valid_range",
      sql`${t.openMin} >= 0 AND ${t.closeMin} <= 1440 AND ${t.openMin} < ${t.closeMin}`,
    ),
  ],
);

/** One-off closed dates (public holidays, vacations). */
export const closures = pgTable("closures", {
  date: date("date", { mode: "string" }).primaryKey(),
  reason: text("reason").notNull().default(""),
});

/**
 * Bookings. Double booking is prevented at the database level by an
 * exclusion constraint added in a custom migration (see drizzle/0001_*.sql):
 *   EXCLUDE USING gist (tstzrange(starts_at, ends_at) WITH &&)
 *   WHERE (status <> 'cancelled')
 */
export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    /** Snapshot so later price/name edits don't rewrite history */
    serviceName: text("service_name").notNull(),
    priceSatang: integer("price_satang").notNull(),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    note: text("note").notNull().default(""),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: bookingStatus("status").notNull().default("confirmed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => [
    index("bookings_starts_at_idx").on(t.startsAt),
    index("bookings_phone_idx").on(t.customerPhone),
    check("bookings_valid_range", sql`${t.endsAt} > ${t.startsAt}`),
  ],
);

export type Service = typeof services.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BusinessHour = typeof businessHours.$inferSelect;
