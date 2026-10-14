import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { getCurrentAdmin } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "เข้าสู่ระบบร้าน", robots: { index: false } };

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");
  return (
    <div className="mx-auto max-w-sm space-y-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">เข้าสู่ระบบสำหรับร้าน</h1>
        <p className="text-muted">จัดการคิว บริการ และเวลาทำการ</p>
      </div>
      <Card>
        <LoginForm />
      </Card>
    </div>
  );
}
