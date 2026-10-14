"use client";

import { Button } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-xl font-semibold">เกิดข้อผิดพลาด</h1>
      <p className="text-muted">ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง</p>
      <Button variant="secondary" onClick={reset}>
        ลองใหม่
      </Button>
    </div>
  );
}
