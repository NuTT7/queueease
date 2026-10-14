"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { bookings, businessHours, closures, services, type BookingStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { bahtToSatang } from "@/lib/format";
import { hhmmToMinutes, isDateString, THAI_WEEKDAYS } from "@/lib/time";
import { formValues, toFieldErrors, type ActionState } from "./types";

/* ---------- Bookings ---------- */

/** Allowed status changes. Cancelled is final (re-activating could double-book). */
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  confirmed: ["completed", "no_show", "cancelled"],
  completed: ["confirmed"],
  no_show: ["confirmed"],
  cancelled: [],
};

const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["confirmed", "completed", "cancelled", "no_show"]),
});

export async function setBookingStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { id, status } = parsed.data;

  const allowedFrom = (Object.keys(TRANSITIONS) as BookingStatus[]).filter((from) =>
    TRANSITIONS[from].includes(status),
  );
  if (allowedFrom.length === 0) return;

  await db
    .update(bookings)
    .set({ status, cancelledAt: status === "cancelled" ? new Date() : null })
    .where(and(eq(bookings.id, id), inArray(bookings.status, allowedFrom)));

  revalidatePath("/admin");
}

/* ---------- Services ---------- */

const serviceSchema = z.object({
  id: z
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  name: z.string().trim().min(1, "กรุณากรอกชื่อบริการ").max(80),
  description: z.string().trim().max(200).default(""),
  durationMin: z.coerce
    .number()
    .int("ต้องเป็นจำนวนเต็ม")
    .min(5, "อย่างน้อย 5 นาที")
    .max(720, "ไม่เกิน 12 ชั่วโมง"),
  price: z
    .string()
    .transform((v) => bahtToSatang(v))
    .refine((v): v is number => v !== null && v <= 10_000_000, "ราคาไม่ถูกต้อง"),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

export async function saveService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "กรุณาตรวจสอบข้อมูล",
      fieldErrors: toFieldErrors(parsed.error.issues),
      values: formValues(formData),
    };
  }
  const { id, price, ...rest } = parsed.data;
  const values = { ...rest, priceSatang: price };

  if (id) await db.update(services).set(values).where(eq(services.id, id));
  else await db.insert(services).values(values);

  revalidatePath("/admin/services");
  revalidatePath("/");
  return { ok: true };
}

/* ---------- Business hours & closures ---------- */

export async function saveHours(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const rows: (typeof businessHours.$inferInsert)[] = [];

  for (let weekday = 0; weekday <= 6; weekday++) {
    const isClosed = formData.get(`closed_${weekday}`) === "on";
    const openMin = hhmmToMinutes(String(formData.get(`open_${weekday}`) ?? ""));
    const closeMin = hhmmToMinutes(String(formData.get(`close_${weekday}`) ?? ""));
    if (openMin === null || closeMin === null || openMin >= closeMin) {
      if (!isClosed) {
        return {
          error: `เวลาเปิด-ปิดวัน${THAI_WEEKDAYS[weekday]}ไม่ถูกต้อง (เวลาปิดต้องหลังเวลาเปิด)`,
          values: formValues(formData),
        };
      }
      rows.push({ weekday, openMin: 600, closeMin: 1200, isClosed });
    } else {
      rows.push({ weekday, openMin, closeMin, isClosed });
    }
  }

  await db.transaction(async (tx) => {
    for (const row of rows) {
      await tx
        .insert(businessHours)
        .values(row)
        .onConflictDoUpdate({
          target: businessHours.weekday,
          set: { openMin: row.openMin, closeMin: row.closeMin, isClosed: row.isClosed },
        });
    }
  });

  revalidatePath("/admin/hours");
  return { ok: true };
}

const closureSchema = z.object({
  date: z.string().refine(isDateString, "วันที่ไม่ถูกต้อง"),
  reason: z.string().trim().max(100).default(""),
});

export async function addClosure(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = closureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "กรุณาตรวจสอบข้อมูล",
      fieldErrors: toFieldErrors(parsed.error.issues),
      values: formValues(formData),
    };
  }
  await db
    .insert(closures)
    .values(parsed.data)
    .onConflictDoUpdate({ target: closures.date, set: { reason: parsed.data.reason } });
  revalidatePath("/admin/hours");
  return { ok: true };
}

export async function removeClosure(formData: FormData): Promise<void> {
  await requireAdmin();
  const date = String(formData.get("date") ?? "");
  if (!isDateString(date)) return;
  await db.delete(closures).where(eq(closures.date, date));
  revalidatePath("/admin/hours");
}
