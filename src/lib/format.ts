const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat("id-ID");

export const fmtIDR = (n: number) => idr.format(n);
export const fmtNum = (n: number) => num.format(n);

export function fmtShortIDR(n: number): string {
  if (n >= 1e9) return (n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " M";
  if (n >= 1e6) return (n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt";
  if (n >= 1e3) return (n / 1e3).toLocaleString("id-ID", { maximumFractionDigits: 0 }) + " rb";
  return String(n);
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
