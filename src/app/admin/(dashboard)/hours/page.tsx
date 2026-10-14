import type { Metadata } from "next";
import { asc, gte } from "drizzle-orm";
import { db } from "@/db";
import { businessHours, closures } from "@/db/schema";
import { removeClosure } from "@/actions/admin";
import { Button, Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { todayInShop } from "@/lib/availability";
import { formatThaiDate, minutesToHHMM } from "@/lib/time";
import { ClosureForm, HoursForm } from "./hours-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "เวลาทำการ", robots: { index: false } };

export default async function HoursPage() {
  await requireAdmin();
  const [hours, upcomingClosures] = await Promise.all([
    db.select().from(businessHours).orderBy(asc(businessHours.weekday)),
    db.select().from(closures).where(gte(closures.date, todayInShop())).orderBy(asc(closures.date)),
  ]);
  const byDay = new Map(hours.map((h) => [h.weekday, h]));
  const days = [1, 2, 3, 4, 5, 6, 0].map((weekday) => {
    const h = byDay.get(weekday);
    return {
      weekday,
      open: minutesToHHMM(h?.openMin ?? 600),
      close: minutesToHHMM(h?.closeMin ?? 1200),
      isClosed: h ? h.isClosed : true,
    };
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h1 className="mb-1 text-xl font-semibold">เวลาทำการประจำสัปดาห์</h1>
        <p className="text-muted mb-4 text-sm">คิวที่จองไว้แล้วจะไม่ถูกยกเลิกอัตโนมัติเมื่อเปลี่ยนเวลา</p>
        <HoursForm days={days} />
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">วันหยุดพิเศษ</h2>
          <p className="text-muted text-sm">เช่น วันสงกรานต์ หรือวันที่ร้านปิดชั่วคราว</p>
        </div>
        <ClosureForm />
        {upcomingClosures.length === 0 ? (
          <p className="text-muted text-sm">ยังไม่มีวันหยุดที่กำหนดไว้</p>
        ) : (
          <ul className="divide-line divide-y">
            {upcomingClosures.map((c) => (
              <li key={c.date} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="font-medium">{formatThaiDate(c.date)}</span>
                  {c.reason && <span className="text-muted"> · {c.reason}</span>}
                </span>
                <form action={removeClosure}>
                  <input type="hidden" name="date" value={c.date} />
                  <Button size="sm" variant="ghost" type="submit">
                    ลบ
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
