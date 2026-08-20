import { createClient } from "@/lib/supabase/server";
import { gbp, driverCut, RATE_CHANGE_DATE, LEGACY_RATE } from "@/lib/utils";
import { PrintButton } from "@/components/PrintButton";
import Link from "next/link";

const isISODate = (s?: string): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const prettyDate = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

// Inclusive number of calendar days between two ISO dates.
function dayCount(start: string, end: string): number {
  const a = new Date(start + "T00:00:00").getTime();
  const b = new Date(end + "T00:00:00").getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

// Work out the date window. A custom From+To range wins; otherwise we fall
// back to a whole calendar month (defaults to the current month).
function resolveBounds(sp: { month?: string; from?: string; to?: string }): {
  start: string;
  end: string;
  monthValue: string;
  fromValue: string;
  toValue: string;
  label: string;
  isRange: boolean;
} {
  const now = new Date();

  // 1. Custom range — only when BOTH from and to are valid dates.
  if (isISODate(sp.from) && isISODate(sp.to)) {
    let start = sp.from;
    let end = sp.to;
    if (start > end) [start, end] = [end, start]; // tolerate reversed order
    return {
      start,
      end,
      monthValue: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      fromValue: start,
      toValue: end,
      label: `${prettyDate(start)} – ${prettyDate(end)} · ${dayCount(start, end)} days`,
      isRange: true,
    };
  }

  // 2. Month fallback.
  let year = now.getFullYear();
  let m = now.getMonth(); // 0-based
  if (sp.month && /^\d{4}-\d{2}$/.test(sp.month)) {
    const [y, mm] = sp.month.split("-").map(Number);
    year = y;
    m = mm - 1;
  }
  const startD = new Date(year, m, 1);
  const endD = new Date(year, m + 1, 0);
  return {
    start: iso(startD),
    end: iso(endD),
    monthValue: `${year}-${String(m + 1).padStart(2, "0")}`,
    fromValue: "",
    toValue: "",
    label: startD.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    }),
    isRange: false,
  };
}

export default async function MonthlySummary({
  searchParams,
}: {
  searchParams: { month?: string; from?: string; to?: string };
}) {
  const supabase = createClient();
  const { start, end, monthValue, fromValue, toValue, label } =
    resolveBounds(searchParams);

  const monthStart = start.slice(0, 7) + "-01";

  const [
    { data: drivers },
    { data: clockins },
    { data: expenses },
    { data: jobs },
    { data: settings },
    { data: adjustments },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, driver_number, display_name, custom_daily_rate")
      .eq("role", "driver")
      .order("driver_number", { ascending: true }),
    supabase
      .from("clockins")
      .select("user_id, half_day, work_date")
      .gte("work_date", start)
      .lte("work_date", end),
    supabase
      .from("expenses")
      .select("user_id, amount")
      .gte("expense_date", start)
      .lte("expense_date", end),
    supabase
      .from("jobs")
      .select("user_id, total, expenses")
      .gte("job_date", start)
      .lte("job_date", end),
    supabase.from("settings").select("daily_rate").single(),
    supabase
      .from("adjustments")
      .select("user_id, amount, note")
      .eq("month", monthStart),
  ]);

  const rate = Number(settings?.daily_rate ?? 100);

  // Split days into pre/post rate change so historical days stay at the old rate.
  const daysOldByUser = new Map<string, number>(); // work_date < RATE_CHANGE_DATE → LEGACY_RATE
  const daysNewByUser = new Map<string, number>(); // work_date >= RATE_CHANGE_DATE → current rate
  for (const c of clockins ?? []) {
    const d = c.half_day ? 0.5 : 1;
    if (c.work_date < RATE_CHANGE_DATE) {
      daysOldByUser.set(c.user_id, (daysOldByUser.get(c.user_id) ?? 0) + d);
    } else {
      daysNewByUser.set(c.user_id, (daysNewByUser.get(c.user_id) ?? 0) + d);
    }
  }

  const expByUser = new Map<string, number>();
  for (const e of expenses ?? [])
    expByUser.set(e.user_id, (expByUser.get(e.user_id) ?? 0) + Number(e.amount));

  // Per car jobs: expenses deducted first, driver takes 60% of net.
  const jobsByUser = new Map<string, { count: number; pay: number }>();
  for (const j of jobs ?? []) {
    const cur = jobsByUser.get(j.user_id) ?? { count: 0, pay: 0 };
    cur.count += 1;
    cur.pay += driverCut(Number(j.total), Number(j.expenses ?? 0));
    jobsByUser.set(j.user_id, cur);
  }

  const adjByUser = new Map<string, number>();
  for (const a of adjustments ?? [])
    adjByUser.set(a.user_id, (adjByUser.get(a.user_id) ?? 0) + Number(a.amount));

  const rows = (drivers ?? []).map((d) => {
    const daysOld = daysOldByUser.get(d.id) ?? 0;
    const daysNew = daysNewByUser.get(d.id) ?? 0;
    const days = daysOld + daysNew;
    const adj = adjByUser.get(d.id) ?? 0;
    const driverRate = d.custom_daily_rate ? Number(d.custom_daily_rate) : rate;
    const earnings = daysOld * LEGACY_RATE + daysNew * driverRate + adj;
    const exp = expByUser.get(d.id) ?? 0;
    const j = jobsByUser.get(d.id) ?? { count: 0, pay: 0 };
    const total = earnings + j.pay;
    return { d, days, earnings, exp, jobCount: j.count, jobPay: j.pay, total };
  });

  const totDays = rows.reduce((s, r) => s + r.days, 0);
  const totEarn = rows.reduce((s, r) => s + r.earnings, 0);
  const totExp = rows.reduce((s, r) => s + r.exp, 0);
  const totJobCount = rows.reduce((s, r) => s + r.jobCount, 0);
  const totJobPay = rows.reduce((s, r) => s + r.jobPay, 0);
  const totTotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        {/* Whole month */}
        <form method="get" className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
            Whole month
            <input
              type="month"
              name="month"
              defaultValue={monthValue}
              className="rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-navy"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-navy px-4 py-2 font-semibold text-white"
          >
            View
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
          <span className="h-px flex-1 bg-slate-200" /> or pick a range{" "}
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Custom date range */}
        <form method="get" className="flex flex-wrap items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
            From
            <input
              type="date"
              name="from"
              defaultValue={fromValue}
              className="rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-navy"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
            To
            <input
              type="date"
              name="to"
              defaultValue={toValue}
              className="rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-navy"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-navy px-4 py-2 font-semibold text-white"
          >
            View
          </button>
        </form>

        <p className="mt-3 text-xs text-slate-400">
          Showing: {label} · rate {gbp(rate)}/day · Total = salary + jobs
          (expenses separate)
        </p>
      </section>

      <div className="flex gap-2 print:hidden">
        <Link
          href={`/manager/summary?from=2026-01-01&to=${iso(new Date())}`}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white"
        >
          All earnings to date
        </Link>
        <PrintButton />
      </div>

      <section className="overflow-x-auto rounded-2xl bg-white p-2 shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-2 py-2">Driver</th>
              <th className="px-2 py-2 text-right">Days</th>
              <th className="px-2 py-2 text-right">Earnings</th>
              <th className="px-2 py-2 text-right">Expenses</th>
              <th className="px-2 py-2 text-right">Jobs</th>
              <th className="px-2 py-2 text-right">Job pay</th>
              <th className="px-2 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ d, days, earnings, exp, jobCount, jobPay, total }) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-2 py-2">
                  <span className="font-medium text-slate-800">
                    {d.driver_number}. {d.display_name}
                  </span>
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{days}</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {gbp(earnings)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {gbp(exp)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {jobCount || "—"}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {jobPay ? gbp(jobPay) : "—"}
                </td>
                <td className="px-2 py-2 text-right font-semibold tabular-nums text-navy">
                  {gbp(total)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-2 py-6 text-center text-slate-400"
                >
                  No drivers yet.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 font-bold text-navy">
              <td className="px-2 py-2">Total</td>
              <td className="px-2 py-2 text-right tabular-nums">{totDays}</td>
              <td className="px-2 py-2 text-right tabular-nums">
                {gbp(totEarn)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {gbp(totExp)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {totJobCount || "—"}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {gbp(totJobPay)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {gbp(totTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>
    </div>
  );
}
