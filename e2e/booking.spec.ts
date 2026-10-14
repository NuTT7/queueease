import { expect, test, type Page } from "@playwright/test";

// Requires a migrated + seeded database (npm run db:migrate && npm run db:seed).
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";

const randomPhone = () => `08${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;

/** Pick a service and a day a few days ahead (so cancellation is still allowed). */
async function openSlots(page: Page, service: RegExp) {
  await page.goto("/book");
  await page.getByRole("button", { name: service }).click();
  const openDays = page.getByRole("group", { name: "วันที่" }).getByRole("button", { disabled: false });
  const day = openDays.nth(2);
  const date = (await day.getAttribute("data-date"))!;
  await day.click();
  const slots = page.getByRole("group", { name: "เวลาว่าง" }).getByRole("button");
  await expect(slots.first()).toBeVisible();
  return Object.assign(slots, { date });
}

async function book(page: Page, service: RegExp, name: string, phone: string) {
  const slots = await openSlots(page, service);
  const time = (await slots.first().innerText()).trim();
  await slots.first().click();
  await page.getByLabel("ชื่อ").fill(name);
  await page.getByLabel("เบอร์โทร").fill(phone);
  await page.getByRole("button", { name: "ยืนยันการจอง" }).click();
  await expect(page).toHaveURL(/\/booking\/[A-Z0-9]{6}\?new=1$/);
  const code = page.url().match(/\/booking\/([A-Z0-9]{6})/)![1];
  return { code, time, date: slots.date };
}

test("home page lists services and opening hours", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "บริการของเรา" })).toBeVisible();
  await expect(page.getByText("เวลาทำการ")).toBeVisible();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("customer books, slot disappears, looks up and cancels", async ({ page }) => {
  const phone = randomPhone();

  // Validation error keeps what the customer typed
  const slots = await openSlots(page, /ตัดผมชาย/);
  await slots.first().click();
  await page.getByLabel("ชื่อ").fill("ทดสอบ ระบบ");
  await page.getByLabel("เบอร์โทร").fill("12");
  await page.getByLabel("เบอร์โทร").evaluate((el) => el.removeAttribute("required"));
  await page.getByRole("button", { name: "ยืนยันการจอง" }).click();
  await expect(page.getByText("เบอร์โทรไม่ถูกต้อง")).toBeVisible();
  await expect(page.getByLabel("ชื่อ")).toHaveValue("ทดสอบ ระบบ");

  const { code, time } = await book(page, /ตัดผมชาย/, "สมชาย ใจดี", phone);
  await expect(page.getByText("จองสำเร็จ")).toBeVisible();
  await expect(page.getByText(code)).toBeVisible();

  // The same start time is no longer offered for that day
  const after = await openSlots(page, /ตัดผมชาย/);
  await expect(after.filter({ hasText: new RegExp(`^${time}$`) })).toHaveCount(0);

  // Look up by code (case-insensitive) + phone
  await page.goto("/booking");
  await page.getByLabel("รหัสการจอง").fill(code.toLowerCase());
  await page.getByLabel("เบอร์โทร").fill(phone);
  await page.getByRole("button", { name: "ค้นหา" }).click();
  await expect(page).toHaveURL(new RegExp(`/booking/${code}$`));

  // Cancel: wrong last-4 is rejected, correct one works
  await page.getByRole("button", { name: "ยกเลิกการจอง" }).click();
  await page.getByLabel(/เลข 4 ตัวท้าย/).fill("0000");
  await page.getByRole("button", { name: "ยืนยันยกเลิก" }).click();
  await expect(page.getByText("เลขท้ายเบอร์โทรไม่ตรงกับการจองนี้")).toBeVisible();
  await page.getByLabel(/เลข 4 ตัวท้าย/).fill(phone.slice(-4));
  await page.getByRole("button", { name: "ยืนยันยกเลิก" }).click();
  await expect(page.getByText("ยกเลิก", { exact: true })).toBeVisible();

  // Cancelled slot is bookable again
  const reopened = await openSlots(page, /ตัดผมชาย/);
  await expect(reopened.filter({ hasText: new RegExp(`^${time}$`) })).toHaveCount(1);
});

test("unknown booking code shows 404", async ({ page }) => {
  const res = await page.goto("/booking/ZZZZZZ");
  expect(res?.status()).toBe(404);
});

test("admin manages bookings, services and hours", async ({ page }) => {
  const customer = `ลูกค้า ${Math.random().toString(36).slice(2, 6)}`;
  const { date } = await book(page, /สระ/, customer, randomPhone());

  // Admin pages and actions require login
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);

  await page.getByLabel("อีเมล").fill(ADMIN_EMAIL);
  await page.getByLabel("รหัสผ่าน").fill("wrong-password");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page.getByText("อีเมลหรือรหัสผ่านไม่ถูกต้อง")).toBeVisible();
  await expect(page.getByLabel("อีเมล")).toHaveValue(ADMIN_EMAIL);
  await page.getByLabel("รหัสผ่าน").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // Open the booking's day and mark it completed
  await page.goto(`/admin?date=${date}`);
  const row = page.locator("li", { hasText: customer });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "เสร็จแล้ว" }).click();
  await expect(row.getByText("เสร็จสิ้น")).toBeVisible();

  // Create a service, then edit another one
  await page.getByRole("link", { name: "บริการ" }).click();
  const forms = page.locator("form:has(input[name=name])");
  const serviceName = `ทรีตเมนต์ ${Date.now() % 10000}`;
  await forms.first().getByLabel("ชื่อบริการ").fill(serviceName);
  await forms.first().getByLabel("ราคา (บาท)").fill("590");
  await forms.first().getByRole("button", { name: "เพิ่มบริการ" }).click();
  await expect(page.locator(`input[value="${serviceName}"]`)).toBeVisible();

  // Business hours: invalid range is rejected and the typed value is kept
  await page.getByRole("link", { name: "เวลาทำการ" }).click();
  await page.getByLabel("เวลาเปิดวันจันทร์").fill("21:00");
  await page.getByRole("button", { name: "บันทึกเวลาทำการ" }).click();
  await expect(page.getByText(/เวลาเปิด-ปิดวันจันทร์ไม่ถูกต้อง/)).toBeVisible();
  await expect(page.getByLabel("เวลาเปิดวันจันทร์")).toHaveValue("21:00");
  await page.getByLabel("เวลาเปิดวันจันทร์").fill("10:00");
  await page.getByRole("button", { name: "บันทึกเวลาทำการ" }).click();
  await expect(page.getByText("บันทึกแล้ว")).toBeVisible();
});
