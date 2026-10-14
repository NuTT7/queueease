"use client";

import { useActionState } from "react";
import { lookupBooking } from "@/actions/booking";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";

export function LookupForm() {
  const [state, formAction] = useActionState(lookupBooking, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && !state.fieldErrors && <Alert>{state.error}</Alert>}
      <Field label="รหัสการจอง" error={state?.fieldErrors?.code}>
        <input
          name="code"
          required
          maxLength={6}
          defaultValue={state?.values?.code}
          autoCapitalize="characters"
          placeholder="เช่น K7M2QX"
          className={`${inputClass} font-mono tracking-widest uppercase`}
        />
      </Field>
      <Field label="เบอร์โทร" error={state?.fieldErrors?.phone}>
        <input
          name="phone"
          required
          inputMode="tel"
          autoComplete="tel"
          defaultValue={state?.values?.phone}
          className={inputClass}
        />
      </Field>
      <SubmitButton className="w-full" pendingText="กำลังค้นหา…">
        ค้นหา
      </SubmitButton>
    </form>
  );
}
