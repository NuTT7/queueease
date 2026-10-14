/** Money is stored as integer satang (1 baht = 100 satang) to avoid float errors. */
export function formatBaht(satang: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(satang / 100);
}

export function bahtToSatang(input: string): number | null {
  const n = Number(input.replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Thai mobile/landline: strips spaces and dashes, returns null when invalid. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  if (/^\+66\d{8,9}$/.test(digits)) return "0" + digits.slice(3);
  return /^0\d{8,9}$/.test(digits) ? digits : null;
}

export function maskPhone(phone: string): string {
  return phone.length <= 4 ? phone : `${"•".repeat(phone.length - 4)}${phone.slice(-4)}`;
}
