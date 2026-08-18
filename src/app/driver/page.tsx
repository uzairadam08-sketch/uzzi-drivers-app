import { createClient } from "@/lib/supabase/server";
import { gbp, monthBounds, monthLabel, toISODate } from "@/lib/utils";
import { clockIn, clockInHalf, undoClockIn } from "./actions";
import Link from "next/link";

export default async function DriverDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const today = toISODate(now);
  const { start, end } = monthBounds(now);

  const [{ data: profile }, { data: monthRows }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("daily_rate_enabled").eq("id", user!.id).single(),
    supabase
      .from("clockins")
      .select("work_date, half_day")
      .eq("user_id", user!.id)
      .gte("work_date", start)
      .lte("work_date", end),
    supabase.from("settings").select("daily_rate").single(),
  ]);

  const dailyRateEnabled = !!profile?.daily_rate_enabled;
  const days = monthRows?.reduce((sum, r) => sum + (r.half_day ? 0.5 : 1), 0) ?? 0;
  const todayRow = monthRows?.find((r) => r.work_date === today);
  const clockedToday = !!todayRow;
  const clockedHalfToday = todayRow?.half_day ?? false;
  const rate = Number(settings?.daily_rate ?? 100);
  const earnings = days * rate;

  return (
    <div className="flex flex-col gap-6">
      {/* Clock-in card */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        {!dailyRateEnabled ? (
          <div className="flex flex-col items-center gap-3 text-center py-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
              🚗
            </div>
            <p className="font-semibold text-slate-800">Per car jobs only</p>
            <p className="text-sm text-slate-400 max-w-xs">
              You&apos;re not on the daily rate. Log your deliveries using the Per Car Jobs tab below.
            </p>
            <Link
              href="/driver/jobs"
              className="mt-1 rounded-xl bg-navy px-6 py-3 text-sm font-semibold text-white"
            >
              Go to Per Car Jobs
            </Link>
          </div>
        ) : clockedToday ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
              ✓
            </div>
            <p className="text-lg font-semibold text-slate-800">
              {clockedHalfToday ? "Clocked in — half day" : "Clocked in for today"}
            </p>
            <p className="text-sm text-slate-500">
              Today: {gbp(clockedHalfToday ? rate / 2 : rate)}
            </p>
            <form action={undoClockIn}>
              <button
                type="submit"
                className="text-sm font-medium text-slate-500 underline underline-offset-2 hover:text-red-600"
              >
                Undo today&apos;s clock-in
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <form action={clockIn}>
              <button
                type="submit"
                className="w-full rounded-xl bg-navy py-6 text-xl font-bold text-white active:scale-[0.99]"
              >
                Clock in for today
                <span className="mt-1 block text-sm font-medium text-white/70">
                  Full day · {gbp(rate)}
                </span>
              </button>
            </form>
            <form action={clockInHalf}>
              <button
                type="submit"
                className="w-full rounded-xl border-2 border-navy bg-white py-5 text-lg font-bold text-navy active:scale-[0.99]"
              >
                Clock in half day
                <span className="mt-1 block text-sm font-medium text-slate-400">
                  Half day · {gbp(rate / 2)}
                </span>
              </button>
            </form>
          </div>
        )}
      </section>

      {/* Month summary — only shown for daily rate drivers */}
      {dailyRateEnabled && (
        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Days worked
            </p>
            <p className="mt-1 text-3xl font-bold text-navy">{days}</p>
            <p className="text-xs text-slate-400">{monthLabel(now)}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Earnings
            </p>
            <p className="mt-1 text-3xl font-bold text-navy">{gbp(earnings)}</p>
            <p className="text-xs text-slate-400">{days} × {gbp(rate)}</p>
          </div>
        </section>
      )}
    </div>
  );
}
