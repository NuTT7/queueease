"use client";

import { useActionState, useState } from "react";
import { cancelBooking } from "@/actions/booking";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Button, Field, inputClass } from "@/components/ui";

export function CancelForm({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(cancelBooking, undefined);

  if (!open) {
    return (
      <Button variant="danger" className="w-full" onClick={() => setOpen(true)}>
        ยกเลิกการจอง
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="code" value={code} />
      {state?.error && <Alert>{state.error}</Alert>}
      <Field label="ยืนยันด้วยเลข 4 ตัวท้ายของเบอร์โทร" error={state?.fieldErrors?.phoneLast4}>
        <input
          name="phoneLast4"
          required
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          className={`${inputClass} font-mono tracking-widest`}
        />
      </Field>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
          ไม่ยกเลิก
        </Button>
        <SubmitButton variant="danger" className="flex-1" pendingText="กำลังยกเลิก…">
          ยืนยันยกเลิก
        </SubmitButton>
      </div>
    </form>
  );
}
