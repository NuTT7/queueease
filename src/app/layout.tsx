import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${config.shopName} — จองคิวออนไลน์`, template: `%s · ${config.shopName}` },
  description: "จองคิวออนไลน์ เลือกบริการและเวลาที่สะดวก ไม่ต้องรอคิวหน้าร้าน",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <header className="border-line border-b bg-white/80 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
              <span aria-hidden className="bg-brand grid size-8 place-items-center rounded-lg text-white">
                ✂
              </span>
              {config.shopName}
            </Link>
            <div className="flex items-center gap-1 text-sm">
              <Link href="/book" className="rounded-lg px-3 py-2 hover:bg-stone-100">
                จองคิว
              </Link>
              <Link href="/booking" className="rounded-lg px-3 py-2 hover:bg-stone-100">
                เช็กการจอง
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="text-muted mx-auto max-w-5xl px-4 pt-4 pb-10 text-sm">
          © {new Date().getFullYear()} {config.shopName} ·{" "}
          <Link href="/admin" className="hover:text-ink">
            สำหรับร้าน
          </Link>
        </footer>
      </body>
    </html>
  );
}
