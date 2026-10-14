import type { Metadata } from "next";
import { getActiveServices, getBookableDates } from "@/lib/availability";
import { formatBaht } from "@/lib/format";
import { BookingForm } from "./booking-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "จองคิว" };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const [{ service }, services, dates] = await Promise.all([
    searchParams,
    getActiveServices(),
    getBookableDates(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">จองคิว</h1>
        <p className="text-muted">เลือกบริการ วัน และเวลาที่สะดวก</p>
      </div>
      <BookingForm
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          durationMin: s.durationMin,
          price: formatBaht(s.priceSatang),
        }))}
        dates={dates}
        initialServiceId={services.some((s) => s.id === service) ? service : undefined}
      />
    </div>
  );
}
