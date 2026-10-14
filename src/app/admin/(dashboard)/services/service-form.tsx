"use client";

import { useActionState } from "react";
import { saveService } from "@/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";

type ServiceValues = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  price: string;
  sortOrder: number;
  isActive: boolean;
};

export function ServiceForm({ service }: { service?: ServiceValues }) {
  const [state, formAction] = useActionState(saveService, undefined);
  const isNew = !service;

  const e = state?.fieldErrors;
  // After a failed submit, re-fill with what the user typed; otherwise use saved values.
  const v = (key: string, saved?: string | number) => state?.values?.[key] ?? saved;
  return (
    <form action={formAction} className="space-y-3">
      {service && <input type="hidden" name="id" value={service.id} />}
      {state?.error && <Alert>{state.error}</Alert>}
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_5rem]">
        <Field label="ชื่อบริการ" error={e?.name}>
          <input name="name" required defaultValue={v("name", service?.name)} className={inputClass} />
        </Field>
        <Field label="ระยะเวลา (นาที)" error={e?.durationMin}>
          <input
            name="durationMin"
            type="number"
            min={5}
            max={720}
            step={5}
            required
            defaultValue={v("durationMin", service?.durationMin ?? 30)}
            className={inputClass}
          />
        </Field>
        <Field label="ราคา (บาท)" error={e?.price}>
          <input
            name="price"
            inputMode="decimal"
            required
            defaultValue={v("price", service?.price)}
            className={inputClass}
          />
        </Field>
        <Field label="ลำดับ" error={e?.sortOrder}>
          <input
            name="sortOrder"
            type="number"
            defaultValue={v("sortOrder", service?.sortOrder ?? 0)}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="คำอธิบาย" error={e?.description}>
        <input
          name="description"
          maxLength={200}
          defaultValue={v("description", service?.description)}
          className={inputClass}
        />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={state?.values ? state.values.isActive === "on" : (service?.isActive ?? true)}
            className="accent-brand size-4"
          />
          เปิดให้จอง
        </label>
        <div className="flex items-center gap-3">
          {state?.ok && <span className="text-sm text-emerald-700">บันทึกแล้ว ✓</span>}
          <SubmitButton size="sm" variant={isNew ? "primary" : "secondary"}>
            {isNew ? "เพิ่มบริการ" : "บันทึก"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
