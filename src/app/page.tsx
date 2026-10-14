import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { businessHours } from "@/db/schema";
import { buttonClass, Card } from "@/components/ui";
import { getActiveServices } from "@/lib/availability";
import { config } from "@/lib/config";
import { formatBaht } from "@/lib/format";
import { minutesToHHMM, THAI_WEEKDAYS } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [services, hours] = await Promise.all([
    getActiveServices(),
    db.select().from(businessHours).orderBy(asc(businessHours.weekday)),
  ]);
  // Show Monday first
  const orderedHours = [...hours.slice(1), ...hours.slice(0, 1)];

  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <p className="bg-brand-soft inline-flex rounded-full px-3 py-1 text-sm font-medium text-amber-900">
            จองล่วงหน้าได้ {config.bookingWindowDays} วัน
          </p>
          <h1 className="text-4xl leading-tight font-bold sm:text-5xl">
            ไม่ต้องรอคิวหน้าร้าน
            <br />
            <span className="text-brand">จองเวลาที่ใช่</span> ในไม่กี่คลิก
          </h1>
          <p className="text-muted max-w-md text-lg">
            เลือกบริการ เลือกเวลาว่าง แล้วรับรหัสการจองทันที เปลี่ยนใจก็ยกเลิกออนไลน์ได้
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/book" className={buttonClass("primary")}>
              จองคิวเลย →
            </Link>
            <Link href="/booking" className={buttonClass("secondary")}>
              ตรวจสอบการจอง
            </Link>
          </div>
        </div>

        <Card>
          <h2 className="mb-3 font-semibold">เวลาทำการ</h2>
          <dl className="divide-line divide-y text-sm">
            {orderedHours.map((h) => (
              <div key={h.weekday} className="flex justify-between py-2">
                <dt>{THAI_WEEKDAYS[h.weekday]}</dt>
                <dd className={h.isClosed ? "text-muted" : "font-medium tabular-nums"}>
                  {h.isClosed ? "ปิด" : `${minutesToHHMM(h.openMin)} – ${minutesToHHMM(h.closeMin)}`}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">บริการของเรา</h2>
        {services.length === 0 ? (
          <p className="text-muted">ยังไม่มีบริการเปิดให้จอง</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {services.map((s) => (
              <Card key={s.id} className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold">{s.name}</h3>
                  {s.description && <p className="text-muted text-sm">{s.description}</p>}
                  <p className="text-muted text-sm">⏱ {s.durationMin} นาที</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-semibold tabular-nums">{formatBaht(s.priceSatang)}</span>
                  <Link href={`/book?service=${s.id}`} className={buttonClass("secondary", "sm")}>
                    จอง
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
