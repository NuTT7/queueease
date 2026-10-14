"use client";

import { useActionState } from "react";
import { addClosure, saveHours } from "@/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import { Alert, cn, Field, inputClass } from "@/components/ui";
import { THAI_WEEKDAYS } from "@/lib/time";

type Day = { weekday: number; open: string; close: string; isClosed: boolean };

export function HoursForm({ days }: { days: Day[] }) {
  const [state, formAction] = useActionState(saveHours, undefined);
  const values = state?.values;
  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <Alert>{state.error}</Alert>}
      <div className="divide-line divide-y">
        {days.map((d) => (
          <div key={d.weekday} className="grid grid-cols-[5.5rem_1fr_1fr_auto] items-center gap-2 py-2">
            <span className="text-sm font-medium">{THAI_WEEKDAYS[d.weekday]}</span>
            <input
              type="time"
              name={`open_${d.weekday}`}
              defaultValue={values?.[`open_${d.weekday}`] ?? d.open}
              step={900}
              aria-label={`เวลาเปิดวัน${THAI_WEEKDAYS[d.weekday]}`}
              className={cn(inputClass, "py-1.5 text-sm")}
            />
            <input
              type="time"
              name={`close_${d.weekday}`}
              defaultValue={values?.[`close_${d.weekday}`] ?? d.close}
              step={900}
              aria-label={`เวลาปิดวัน${THAI_WEEKDAYS[d.weekday]}`}
              className={cn(inputClass, "py-1.5 text-sm")}
            />
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name={`closed_${d.weekday}`}
                defaultChecked={values ? values[`closed_${d.weekday}`] === "on" : d.isClosed}
                className="accent-brand size-4"
              />
              ปิด
            </label>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-3">
        {state?.ok && <span className="text-sm text-emerald-700">บันทึกแล้ว ✓</span>}
        <SubmitButton size="sm">บันทึกเวลาทำการ</SubmitButton>
      </div>
    </form>
  );
}

export function ClosureForm() {
  const [state, formAction] = useActionState(addClosure, undefined);

  return (
    <form action={formAction} className="space-y-2">
      {state?.error && !state.fieldErrors && <Alert>{state.error}</Alert>}
      <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-end">
        <Field label="วันที่" error={state?.fieldErrors?.date}>
          <input
            type="date"
            name="date"
            required
            defaultValue={state?.values?.date}
            className={cn(inputClass, "py-1.5 text-sm")}
          />
        </Field>
        <Field label="เหตุผล" error={state?.fieldErrors?.reason}>
          <input
            name="reason"
            maxLength={100}
            placeholder="เช่น หยุดสงกรานต์"
            defaultValue={state?.values?.reason}
            className={cn(inputClass, "py-1.5 text-sm")}
          />
        </Field>
        <SubmitButton size="sm" variant="secondary">
          เพิ่ม
        </SubmitButton>
      </div>
    </form>
  );
}
