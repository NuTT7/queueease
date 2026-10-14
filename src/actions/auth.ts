"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { createSession, destroySession } from "@/lib/session";
import { formValues, type ActionState } from "./types";

const loginSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(200),
});

// Simple in-memory throttle: 5 failed attempts per email per 15 minutes.
// Good enough for a single instance; use Redis for multiple instances.
const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;
const failures = new Map<string, { count: number; first: number }>();

function isLocked(email: string): boolean {
  const entry = failures.get(email);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(email);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(email: string) {
  const entry = failures.get(email);
  if (!entry || Date.now() - entry.first > WINDOW_MS) failures.set(email, { count: 1, first: Date.now() });
  else entry.count++;
}

// Compared against when the email doesn't exist, so response time doesn't
// reveal which emails are registered.
const DUMMY_HASH = "$2b$12$1of28FTiIWo7/J8d/9eVoeRqnPMJNWhRnvuHRTg2WMo5O/8.b2Lym";

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", values: formValues(formData, ["password"]) };
  const { email, password } = parsed.data;

  if (isLocked(email)) {
    return { error: "พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาที", values: { email } };
  }

  const [admin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  const valid = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !valid) {
    recordFailure(email);
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", values: formValues(formData, ["password"]) };
  }

  failures.delete(email);
  await createSession(admin.id);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
