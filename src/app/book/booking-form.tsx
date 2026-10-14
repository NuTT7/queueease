"use client";

import { useActionState, useEffect, useState } from "react";
import { createBooking } from "@/actions/booking";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, cn, Field, inputClass } from "@/components/ui";
import { formatThaiDate } from "@/lib/time";

type ServiceOption = { id: string; name: string; durationMin: number; price: string };
type DateOption = { date: string; closed: boolean };
type Slot = { start: string; label: string };
type SlotResult = { key: string; slots: Slot[]; error?: string };

export function BookingForm({
  services,
  dates,
  initialServiceId,
}: {
  services: ServiceOption[];
  dates: DateOption[];
  initialServiceId?: string;
}) {
  const [serviceId, setServiceId] = useState(initialServiceId ?? "");
  const [date, setDate] = useState(() => dates.find((d) => !d.closed)?.date ?? "");
  const [selectedStart, setSelectedStart] = useState("");
  const [result, setResult] = useState<SlotResult | null>(null);
  // Controlled so values survive React's automatic form reset after a failed submit.
  const [contact, setContact] = useState({ customerName: "", phone: "", note: "" });
  const [state, formAction] = useActionState(createBooking, undefined);

  const key = serviceId && date ? `${serviceId}|${date}` : "";
  const loading = Boolean(key) && result?.key !== key;
  const slots = result?.key === key ? result.slots : [];
  const service = services.find((s) => s.id === serviceId);

  // Fetch available slots whenever service or date changes.
  useEffect(() => {
    if (!key) return;
    const [sid, d] = key.split("|");
    const controller = new AbortController();
    fetch(`/api/slots?serviceId=${sid}&date=${d}`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { slots: Slot[] };
        setResult({ key, slots: data.slots });
      })
      .catch((err: unknown) => {
        if ((err as Error).name === "AbortError") return;
        setResult({ key, slots: [], error: "โหลดเวลาว่างไม่สำเร็จ ลองใหม่อีกครั้ง" });
      });
    return () => controller.abort();
  }, [key, state]); // refetch after a failed submit (slot may have been taken)

  const chosenSlot = slots.find((s) => s.start === selectedStart);

  if (services.length === 0) {
    return <Alert tone="info">ขณะนี้ยังไม่มีบริการเปิดให้จอง</Alert>;
  }

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && <Alert>{state.error}</Alert>}

      <Card className="space-y-3">
        <StepTitle n={1}>เลือกบริการ</StepTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setServiceId(s.id);
                setSelectedStart("");
              }}
              aria-pressed={s.id === serviceId}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                s.id === serviceId
                  ? "border-brand bg-brand-soft ring-brand ring-1"
                  : "border-line hover:border-stone-400",
              )}
            >
              <div className="font-medium">{s.name}</div>
              <div className="text-muted text-sm">
                {s.durationMin} นาที · {s.price}
              </div>
            </button>
          ))}
        </div>
        <input type="hidden" name="serviceId" value={serviceId} />
      </Card>

      <Card className="space-y-3">
        <StepTitle n={2}>เลือกวัน</StepTitle>
        <div role="group" aria-label="วันที่" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {dates.map((d) => {
            const [weekday, ...rest] = formatThaiDate(d.date).split(" ");
            return (
              <button
                key={d.date}
                type="button"
                disabled={d.closed}
                onClick={() => {
                  setDate(d.date);
                  setSelectedStart("");
                }}
                aria-pressed={d.date === date}
                data-date={d.date}
                aria-label={`${formatThaiDate(d.date)}${d.closed ? " (ร้านปิด)" : ""}`}
                className={cn(
                  "flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-xl border px-2 py-2 text-sm transition-colors",
                  d.closed && "cursor-not-allowed border-dashed text-stone-300",
                  !d.closed && d.date === date && "border-brand bg-brand text-white",
                  !d.closed && d.date !== date && "border-line hover:border-stone-400",
                )}
              >
                <span className="text-xs opacity-80">{weekday}</span>
                <span className="font-semibold">{rest.slice(0, 2).join(" ")}</span>
                {d.closed && <span className="text-[10px]">ปิด</span>}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-3">
        <StepTitle n={3}>เลือกเวลา</StepTitle>
        {!serviceId ? (
          <p className="text-muted text-sm">เลือกบริการก่อนเพื่อดูเวลาว่าง</p>
        ) : loading ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" aria-label="กำลังโหลด">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-stone-100" />
            ))}
          </div>
        ) : result?.error ? (
          <Alert>{result.error}</Alert>
        ) : slots.length === 0 ? (
          <p className="text-muted text-sm">วันนี้ไม่มีเวลาว่างสำหรับบริการนี้ ลองเลือกวันอื่น</p>
        ) : (
          <div role="group" aria-label="เวลาว่าง" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {slots.map((slot) => (
              <button
                key={slot.start}
                type="button"
                onClick={() => setSelectedStart(slot.start)}
                aria-pressed={slot.start === selectedStart}
                className={cn(
                  "rounded-lg border py-2 text-sm font-medium tabular-nums transition-colors",
                  slot.start === selectedStart
                    ? "border-brand bg-brand text-white"
                    : "border-line hover:border-stone-400",
                )}
              >
                {slot.label}
              </button>
            ))}
          </div>
        )}
        <input type="hidden" name="startsAt" value={chosenSlot ? selectedStart : ""} />
      </Card>

      <Card className="space-y-4">
        <StepTitle n={4}>ข้อมูลติดต่อ</StepTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ชื่อ" error={state?.fieldErrors?.customerName}>
            <input
              name="customerName"
              value={contact.customerName}
              onChange={(e) => setContact((c) => ({ ...c, customerName: e.target.value }))}
              required
              maxLength={80}
              autoComplete="name"
              className={inputClass}
            />
          </Field>
          <Field label="เบอร์โทร" error={state?.fieldErrors?.phone}>
            <input
              name="phone"
              value={contact.phone}
              onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="08x-xxx-xxxx"
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="หมายเหตุ (ถ้ามี)" error={state?.fieldErrors?.note}>
          <textarea
            name="note"
            value={contact.note}
            onChange={(e) => setContact((c) => ({ ...c, note: e.target.value }))}
            rows={2}
            maxLength={300}
            className={inputClass}
          />
        </Field>

        {service && chosenSlot && (
          <div className="rounded-xl bg-stone-50 p-3 text-sm">
            <span className="font-medium">{service.name}</span> · {formatThaiDate(date)} เวลา{" "}
            <span className="font-medium tabular-nums">{chosenSlot.label}</span> ({service.durationMin} นาที)
            · {service.price}
          </div>
        )}

        <SubmitButton className="w-full" disabled={!chosenSlot} pendingText="กำลังจอง…">
          ยืนยันการจอง
        </SubmitButton>
      </Card>
    </form>
  );
}

function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 font-semibold">
      <span className="bg-ink grid size-6 place-items-center rounded-full text-xs text-white">{n}</span>
      {children}
    </h2>
  );
}
