CREATE TYPE "public"."booking_status" AS ENUM('confirmed', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"service_id" uuid NOT NULL,
	"service_name" text NOT NULL,
	"price_satang" integer NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "booking_status" DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "bookings_code_unique" UNIQUE("code"),
	CONSTRAINT "bookings_valid_range" CHECK ("bookings"."ends_at" > "bookings"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "business_hours" (
	"weekday" smallint PRIMARY KEY NOT NULL,
	"open_min" integer NOT NULL,
	"close_min" integer NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "business_hours_weekday_range" CHECK ("business_hours"."weekday" BETWEEN 0 AND 6),
	CONSTRAINT "business_hours_valid_range" CHECK ("business_hours"."open_min" >= 0 AND "business_hours"."close_min" <= 1440 AND "business_hours"."open_min" < "business_hours"."close_min")
);
--> statement-breakpoint
CREATE TABLE "closures" (
	"date" date PRIMARY KEY NOT NULL,
	"reason" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"duration_min" integer NOT NULL,
	"price_satang" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_duration_positive" CHECK ("services"."duration_min" > 0 AND "services"."duration_min" <= 720),
	CONSTRAINT "services_price_non_negative" CHECK ("services"."price_satang" >= 0)
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_starts_at_idx" ON "bookings" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "bookings_phone_idx" ON "bookings" USING btree ("customer_phone");