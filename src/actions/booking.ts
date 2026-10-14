"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { db, pgErrorCode, PG_EXCLUSION_VIOLATION, PG_UNIQUE_VIOLATION } from "@/db";
import { bookings } from "@/db/schema";
import { getActiveService, getAvailableSlots } from "@/lib/availability";
import { generateBookingCode } from "@/lib/booking-code";
import { canCustomerCancel } from "@/lib/booking-rules";
import { config } from "@/lib/config";
import { normalizePhone } from "@/lib/format";
import { notifyShop } from "@/lib/notify";
import { formatThaiDate, formatTime, toZonedDateString } from "@/lib/time";
import { formValues, toFieldErrors, type ActionState } from "./types";

const MAX_ACTIVE_BOOKINGS_PER_PHONE = 3;

const phoneField = z
  .string()
  .transform((v) => normalizePhone(v))
  .refine((v): v is string => v !== null, "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)");

const createSchema = z.object({
  serviceId: z.uuid("กรุณาเลือกบริการ"),
  startsAt: z.iso.datetime({ message: "กรุณาเลือกเวลา" }),
  customerName: z.string().trim().min(2, "กรุณากรอกชื่อ").max(80, "ชื่อยาวเกินไป"),
  phone: phoneField,
  note: z.string().trim().max(300, "หมายเหตุยาวเกินไป").optional().default(""),
});

export async function createBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "กรุณาตรวจสอบข้อมูล", fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const { serviceId, startsAt, customerName, phone, note } = parsed.data;

  const service = await getActiveService(serviceId);
  if (!service) return { error: "ไม่พบบริการนี้ หรือบริการปิดให้จองแล้ว" };

  // Re-validate on the server: never trust the slot the browser sent.
  const start = new Date(startsAt);
  const date = toZonedDateString(start, config.timezone);
  const slots = await getAvailableSlots(service, date);
  if (!slots.some((s) => s.start.getTime() === start.getTime())) {
    return { error: "ช่วงเวลานี้ไม่ว่างแล้ว กรุณาเลือกเวลาใหม่" };
  }

  // Basic abuse protection: limit future bookings per phone number.
  const [{ active }] = await db
    .select({ active: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.customerPhone, phone),
        eq(bookings.status, "confirmed"),
        gt(bookings.startsAt, new Date()),
      ),
    );
  if (active >= MAX_ACTIVE_BOOKINGS_PER_PHONE) {
    return { error: `เบอร์นี้มีคิวที่รออยู่ ${active} คิวแล้ว (สูงสุด ${MAX_ACTIVE_BOOKINGS_PER_PHONE})` };
  }

  const end = new Date(start.getTime() + service.durationMin * 60_000);
  let code: string | null = null;

  for (let attempt = 0; attempt < 5 && !code; attempt++) {
    const candidate = generateBookingCode();
    try {
      await db.insert(bookings).values({
        code: candidate,
        serviceId: service.id,
        serviceName: service.name,
        priceSatang: service.priceSatang,
        customerName,
        customerPhone: phone,
        note,
        startsAt: start,
        endsAt: end,
      });
      code = candidate;
    } catch (err) {
      const pgCode = pgErrorCode(err);
      // Someone else grabbed an overlapping slot between our check and insert.
      if (pgCode === PG_EXCLUSION_VIOLATION) {
        return { error: "มีคนจองช่วงเวลานี้ไปก่อนแล้ว กรุณาเลือกเวลาใหม่" };
      }
      if (pgCode === PG_UNIQUE_VIOLATION) continue; // booking code collision, retry
      throw err;
    }
  }
  if (!code) return { error: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง" };

  const when = `${formatThaiDate(date)} ${formatTime(start, config.timezone)}`;
  // Runs after the response is sent, so a slow webhook never delays the customer.
  after(() => notifyShop(`📅 คิวใหม่ ${code}: ${customerName} — ${service.name} ${when}`));

  revalidatePath("/admin");
  redirect(`/booking/${code}?new=1`);
}

const cancelSchema = z.object({
  code: z.string().trim().toUpperCase().length(6),
  phoneLast4: z.string().regex(/^\d{4}$/, "กรอกเลข 4 ตัวท้ายของเบอร์โทร"),
});

export async function cancelBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = cancelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "ข้อมูลไม่ถูกต้อง", fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const { code, phoneLast4 } = parsed.data;

  const [booking] = await db.select().from(bookings).where(eq(bookings.code, code)).limit(1);
  if (!booking || !booking.customerPhone.endsWith(phoneLast4)) {
    return { error: "เลขท้ายเบอร์โทรไม่ตรงกับการจองนี้" };
  }
  if (booking.status !== "confirmed") return { error: "การจองนี้ไม่สามารถยกเลิกได้แล้ว" };
  if (!canCustomerCancel(booking)) {
    return {
      error: `ยกเลิกออนไลน์ได้ก่อนเวลานัดอย่างน้อย ${config.cancelCutoffMinutes / 60} ชั่วโมง กรุณาโทรติดต่อร้าน`,
    };
  }

  // Conditional update guards against a double-click race.
  const updated = await db
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(and(eq(bookings.id, booking.id), eq(bookings.status, "confirmed")))
    .returning({ id: bookings.id });
  if (updated.length === 0) return { error: "การจองนี้ถูกยกเลิกไปแล้ว" };

  after(() => notifyShop(`❌ ลูกค้ายกเลิกคิว ${code}: ${booking.customerName} — ${booking.serviceName}`));

  revalidatePath(`/booking/${code}`);
  revalidatePath("/admin");
  return { ok: true };
}

const lookupSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, "รหัสการจองมี 6 ตัวอักษร"),
  phone: phoneField,
});

export async function lookupBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = lookupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "กรุณาตรวจสอบข้อมูล",
      fieldErrors: toFieldErrors(parsed.error.issues),
      values: formValues(formData),
    };
  }
  const [booking] = await db
    .select({ code: bookings.code })
    .from(bookings)
    .where(and(eq(bookings.code, parsed.data.code), eq(bookings.customerPhone, parsed.data.phone)))
    .limit(1);
  if (!booking) {
    return { error: "ไม่พบการจองที่ตรงกับรหัสและเบอร์โทรนี้", values: formValues(formData) };
  }
  redirect(`/booking/${booking.code}`);
}
