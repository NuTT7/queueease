import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getActiveService, getAvailableSlots } from "@/lib/availability";
import { config } from "@/lib/config";
import { formatTime, isDateString } from "@/lib/time";

const querySchema = z.object({
  serviceId: z.uuid(),
  date: z.string().refine(isDateString),
});

/** GET /api/slots?serviceId=…&date=YYYY-MM-DD → { slots: [{ start, label }] } */
export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const service = await getActiveService(parsed.data.serviceId);
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  const slots = await getAvailableSlots(service, parsed.data.date);
  return NextResponse.json(
    {
      slots: slots.map((s) => ({
        start: s.start.toISOString(),
        label: formatTime(s.start, config.timezone),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
