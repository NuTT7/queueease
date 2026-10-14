import Link from "next/link";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "ตารางคิว" },
  { href: "/admin/services", label: "บริการ" },
  { href: "/admin/hours", label: "เวลาทำการ" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="space-y-6">
      <div className="border-line flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-3 py-2">
        <nav className="flex flex-wrap gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 font-medium hover:bg-stone-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="text-muted flex items-center gap-2 text-sm">
          <span className="hidden sm:inline">{admin.email}</span>
          <Button variant="ghost" size="sm" type="submit">
            ออกจากระบบ
          </Button>
        </form>
      </div>
      {children}
    </div>
  );
}
