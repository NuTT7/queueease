import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <p className="text-brand text-6xl font-bold">404</p>
      <h1 className="text-xl font-semibold">ไม่พบหน้าที่คุณต้องการ</h1>
      <p className="text-muted">ลิงก์อาจไม่ถูกต้อง หรือรหัสการจองไม่มีในระบบ</p>
      <Link href="/" className={buttonClass("secondary")}>
        กลับหน้าแรก
      </Link>
    </div>
  );
}
