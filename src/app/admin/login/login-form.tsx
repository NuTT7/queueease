"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";

export function LoginForm() {
  const [state, formAction] = useActionState(login, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert>{state.error}</Alert>}
      <Field label="อีเมล">
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          defaultValue={state?.values?.email}
          className={inputClass}
        />
      </Field>
      <Field label="รหัสผ่าน">
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </Field>
      <SubmitButton className="w-full" pendingText="กำลังเข้าสู่ระบบ…">
        เข้าสู่ระบบ
      </SubmitButton>
    </form>
  );
}
