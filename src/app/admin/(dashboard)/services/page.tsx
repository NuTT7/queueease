import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { ServiceForm } from "./service-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "จัดการบริการ", robots: { index: false } };

export default async function ServicesPage() {
  await requireAdmin();
  const rows = await db.select().from(services).orderBy(asc(services.sortOrder), asc(services.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">บริการ</h1>
        <p className="text-muted text-sm">
          ปิดบริการแทนการลบ เพื่อเก็บประวัติการจองเดิมไว้ การแก้ราคาจะไม่กระทบคิวที่จองไปแล้ว
        </p>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold">เพิ่มบริการใหม่</h2>
        <ServiceForm />
      </Card>

      <div className="space-y-3">
        {rows.map((s) => (
          <Card key={s.id} className={s.isActive ? "" : "bg-stone-50"}>
            <ServiceForm
              service={{
                id: s.id,
                name: s.name,
                description: s.description,
                durationMin: s.durationMin,
                price: String(s.priceSatang / 100),
                sortOrder: s.sortOrder,
                isActive: s.isActive,
              }}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
