import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { Alert, buttonClass, Card, StatusBadge } from "@/components/ui";
import { canCustomerCancel } from "@/lib/booking-rules";
import { config } from "@/lib/config";
import { formatBaht, maskPhone } from "@/lib/format";
import { formatThaiDate, formatTime, toZonedDateString } from "@/lib/time";
import { CancelForm } from "./cancel-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "รายละเอียดการจอง", robots: { index: false } };

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const [{ code }, { new: isNew }] = await Promise.all([params, searchParams]);
  const normalized = code.toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalized)) notFound();

  const [booking] = await db.select().from(bookings).where(eq(bookings.code, normalized)).limit(1);
  if (!booking) notFound();

  const tz = config.timezone;
  const date = toZonedDateString(booking.startsAt, tz);
  const canCancel = canCustomerCancel(booking);

  return (
    <div className="mx-auto max-w-md space-y-5">
      {isNew && booking.status === "confirmed" && (
        <Alert tone="success">
          จองสำเร็จ! กรุณาจดรหัสการจองไว้ หรือบันทึกลิงก์หน้านี้เพื่อตรวจสอบภายหลัง
        </Alert>
      )}

      <Card className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-muted text-sm">รหัสการจอง</p>
            <p className="font-mono text-3xl font-bold tracking-widest">{booking.code}</p>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted">บริการ</dt>
          <dd className="font-medium">{booking.serviceName}</dd>
          <dt className="text-muted">วันที่</dt>
          <dd className="font-medium">{formatThaiDate(date)}</dd>
          <dt className="text-muted">เวลา</dt>
          <dd className="font-medium tabular-nums">
            {formatTime(booking.startsAt, tz)} – {formatTime(booking.endsAt, tz)}
          </dd>
          <dt className="text-muted">ราคา</dt>
          <dd className="font-medium">{formatBaht(booking.priceSatang)}</dd>
          <dt className="text-muted">ชื่อ</dt>
          <dd>{booking.customerName}</dd>
          <dt className="text-muted">เบอร์โทร</dt>
          <dd className="tabular-nums">{maskPhone(booking.customerPhone)}</dd>
          {booking.note && (
            <>
              <dt className="text-muted">หมายเหตุ</dt>
              <dd>{booking.note}</dd>
            </>
          )}
        </dl>
      </Card>

      {canCancel ? (
        <Card>
          <CancelForm code={booking.code} />
        </Card>
      ) : booking.status === "confirmed" ? (
        <p className="text-muted text-center text-sm">
          ใกล้ถึงเวลานัดแล้ว หากต้องการยกเลิกกรุณาติดต่อร้านโดยตรง
        </p>
      ) : null}

      <div className="text-center">
        <Link href="/book" className={buttonClass("ghost", "sm")}>
          จองคิวใหม่
        </Link>
      </div>
    </div>
  );
}
