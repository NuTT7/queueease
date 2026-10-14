-- Prevent double booking at the database level.
-- Two active (non-cancelled) bookings may never have overlapping time ranges,
-- even if two customers submit the same slot at the exact same moment.
-- '[)' = half-open range, so 10:00-10:30 and 10:30-11:00 do NOT conflict.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (tstzrange("starts_at", "ends_at", '[)') WITH &&)
  WHERE ("status" <> 'cancelled');
