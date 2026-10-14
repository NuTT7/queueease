import type { ComponentProps, ReactNode } from "react";
import type { BookingStatus } from "@/db/schema";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("border-line rounded-2xl border bg-white p-5 shadow-sm sm:p-6", className)}
      {...props}
    />
  );
}

const buttonStyles = {
  primary: "bg-brand text-white hover:bg-brand-dark disabled:bg-stone-300",
  secondary: "border border-line bg-white text-ink hover:bg-stone-50 disabled:text-stone-400",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  ghost: "text-muted hover:text-ink hover:bg-stone-100",
};

export function buttonClass(variant: keyof typeof buttonStyles = "primary", size: "sm" | "md" = "md") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed",
    size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5",
    buttonStyles[variant],
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof buttonStyles; size?: "sm" | "md" }) {
  return <button className={cn(buttonClass(variant, size), className)} {...props} />;
}

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink placeholder:text-stone-400 focus:border-brand focus:outline-none";

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  // Hint/error live outside the <label> so they don't become part of the input's accessible name.
  return (
    <div className="space-y-1.5">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{label}</span>
        {children}
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted text-sm">{hint}</p>
      ) : null}
    </div>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children: ReactNode;
}) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-amber-200 bg-brand-soft text-amber-900",
  }[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-xl border px-4 py-3 text-sm", styles)}
    >
      {children}
    </div>
  );
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: "ยืนยันแล้ว",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  no_show: "ไม่มาตามนัด",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const styles: Record<BookingStatus, string> = {
    confirmed: "bg-sky-50 text-sky-700 ring-sky-200",
    completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    cancelled: "bg-stone-100 text-stone-500 ring-stone-200",
    no_show: "bg-red-50 text-red-700 ring-red-200",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1", styles[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}
