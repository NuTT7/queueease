import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, count, eq, gte, lt, ne, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { bookings, type BookingStatus } from "@/db/schema";
import { setBookingStatus } from "@/actions/admin";
import { Button, buttonClass, Card, cn, inputClass, StatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { todayInShop } from "@/lib/availability";
import { config } from "@/lib/config";
import { formatBaht } from "@/lib/format";
import { addDays, formatThaiDate, formatTime, isDateString, zonedToUtc } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "จัดการคิว", robots: { index: false } };

const ACTIONS: Record<
  BookingStatus,
  { status: BookingStatus; label: string; variant: "secondary" | "danger" | "ghost" }[]
> = {
  confirmed: [
    { status: "completed", label: "เสร็จแล้ว", variant: "secondary" },
    { status: "no_show", label: "ไม่มา", variant: "ghost" },
    { status: "cancelled", label: "ยกเลิก", variant: "danger" },
  ],
  completed: [{ status: "confirmed", label: "ย้อนกลับ", variant: "ghost" }],
  no_show: [{ status: "confirmed", label: "ย้อนกลับ", variant: "ghost" }],
  cancelled: [],
};

function dayRange(date: string) {
  return {
    start: zonedToUtc(date, 0, config.timezone),
    end: zonedToUtc(addDays(date, 1), 0, config.timezone),
  };
}

function monthRange(today: string) {
  const [y, m] = today.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const nextFirst = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { start: zonedToUtc(first, 0, config.timezone), end: zonedToUtc(nextFirst, 0, config.timezone) };
}

async function getStats(today: string) {
  const now = new Date();
  const todayR = dayRange(today);
  const monthR = monthRange(today);
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60_000);

  const [[todayRow], [upcomingRow], [monthRow]] = await Promise.all([
    db
      .select({ n: count() })
      .from(bookings)
      .where(
        and(
          ne(bookings.status, "cancelled"),
          gte(bookings.startsAt, todayR.start),
          lt(bookings.startsAt, todayR.end),
        ),
      ),
    db
      .select({ n: count() })
      .from(bookings)
      .where(and(eq(bookings.status, "confirmed"), gte(bookings.startsAt, now), lt(bookings.startsAt, in7))),
    db
      .select({
        revenue: sum(sql`CASE WHEN ${bookings.status} = 'completed' THEN ${bookings.priceSatang} ELSE 0 END`),
        completed: count(sql`CASE WHEN ${bookings.status} = 'completed' THEN 1 END`),
        noShow: count(sql`CASE WHEN ${bookings.status} = 'no_show' THEN 1 END`),
      })
      .from(bookings)
      .where(and(gte(bookings.startsAt, monthR.start), lt(bookings.startsAt, monthR.end))),
  ]);

  const attended = monthRow.completed + monthRow.noShow;
  return {
    today: todayRow.n,
    upcoming: upcomingRow.n,
    revenue: Number(monthRow.revenue ?? 0),
    noShowRate: attended === 0 ? null : Math.round((monthRow.noShow / attended) * 100),
  };
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireAdmin();
  const today = todayInShop();
  const { date: rawDate } = await searchParams;
  const date = rawDate && isDateString(rawDate) ? rawDate : today;
  const range = dayRange(date);

  const [stats, dayBookings] = await Promise.all([
    getStats(today),
    db
      .select()
      .from(bookings)
      .where(and(gte(bookings.startsAt, range.start), lt(bookings.startsAt, range.end)))
      .orderBy(asc(bookings.startsAt)),
  ]);
  const active = dayBookings.filter((b) => b.status !== "cancelled");
  const tz = config.timezone;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="คิววันนี้" value={String(stats.today)} />
        <Stat label="รอให้บริการ 7 วันข้างหน้า" value={String(stats.upcoming)} />
        <Stat label="รายได้เดือนนี้ (เสร็จแล้ว)" value={formatBaht(stats.revenue)} />
        <Stat
          label="อัตราไม่มาตามนัด (เดือนนี้)"
          value={stats.noShowRate === null ? "–" : `${stats.noShowRate}%`}
        />
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{formatThaiDate(date)}</h1>
            <p className="text-muted text-sm">
              {active.length} คิว{date === today ? " · วันนี้" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin?date=${addDays(date, -1)}`}
              className={buttonClass("secondary", "sm")}
              aria-label="วันก่อนหน้า"
            >
              ←
            </Link>
            <Link href="/admin" className={buttonClass("secondary", "sm")}>
              วันนี้
            </Link>
            <Link
              href={`/admin?date=${addDays(date, 1)}`}
              className={buttonClass("secondary", "sm")}
              aria-label="วันถัดไป"
            >
              →
            </Link>
            <form className="flex gap-2">
              <input
                type="date"
                name="date"
                defaultValue={date}
                className={cn(inputClass, "py-1.5 text-sm")}
              />
              <Button size="sm" variant="secondary" type="submit">
                ไป
              </Button>
            </form>
          </div>
        </div>

        {dayBookings.length === 0 ? (
          <p className="text-muted py-10 text-center">ไม่มีคิวในวันนี้</p>
        ) : (
          <ul className="divide-line divide-y">
            {dayBookings.map((b) => (
              <li
                key={b.id}
                className={cn(
                  "flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between",
                  b.status === "cancelled" && "opacity-50",
                )}
              >
                <div className="flex gap-4">
                  <div className="w-24 shrink-0 font-semibold tabular-nums">
                    {formatTime(b.startsAt, tz)}
                    <span className="text-muted block text-xs font-normal">
                      ถึง {formatTime(b.endsAt, tz)}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{b.customerName}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="text-muted text-sm">
                      {b.serviceName} · {formatBaht(b.priceSatang)} ·{" "}
                      <a href={`tel:${b.customerPhone}`} className="hover:text-ink tabular-nums">
                        {b.customerPhone}
                      </a>{" "}
                      · <span className="font-mono">{b.code}</span>
                    </div>
                    {b.note && <div className="text-sm">📝 {b.note}</div>}
                  </div>
                </div>
                <div className="flex gap-2 sm:justify-end">
                  {ACTIONS[b.status].map((a) => (
                    <form key={a.status} action={setBookingStatus}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="status" value={a.status} />
                      <Button size="sm" variant={a.variant} type="submit">
                        {a.label}
                      </Button>
                    </form>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4 sm:p-4">
      <p className="text-muted text-xs">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}
