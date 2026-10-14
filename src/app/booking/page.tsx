import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { LookupForm } from "./lookup-form";

export const metadata: Metadata = { title: "ตรวจสอบการจอง" };

export default function LookupPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ตรวจสอบการจอง</h1>
        <p className="text-muted">กรอกรหัสการจอง 6 หลักและเบอร์โทรที่ใช้จอง</p>
      </div>
      <Card>
        <LookupForm />
      </Card>
    </div>
  );
}
