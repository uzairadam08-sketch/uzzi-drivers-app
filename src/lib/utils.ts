// Shared helpers.

// Format a number as GBP, e.g. 1234.5 -> "£1,234.50".
export function gbp(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount ?? 0);
}

// "YYYY-MM-DD" for a Date, in local time (avoids UTC off-by-one).
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// First and last day (inclusive) of the month containing `ref`,
// returned as ISO date strings.
export function monthBounds(ref: Date): { start: string; end: string } {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

// Human month label, e.g. "June 2026".
export function monthLabel(ref: Date): string {
  return ref.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

// Daily rate changed from £100 to £120 on this date. Days before this use LEGACY_RATE.
export const RATE_CHANGE_DATE = "2026-08-19";
export const LEGACY_RATE = 100;

// Per car jobs: company covers expenses first, then driver takes 60% of the net.
export const DRIVER_SHARE = 0.6;

// Driver's cut: (total - expenses) * 60%, rounded to the penny.
export function driverCut(total: number, expenses = 0): number {
  const net = Math.max(0, (total ?? 0) - (expenses ?? 0));
  return Math.round(net * DRIVER_SHARE * 100) / 100;
}
