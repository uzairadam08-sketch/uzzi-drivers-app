import { createClient } from "@/lib/supabase/server";
import { gbp, toISODate } from "@/lib/utils";
import { updateRate } from "./actions";

export default async function ManagerDashboard({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const supabase = createClient();

  const today = toISODate(new Date());
  const date = searchParams.date ?? today;

  const [{ data: drivers }, { data: clockins }, { data: settings }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, driver_number, display_name")
        .eq("role", "driver")
        .order("driver_number", { ascending: true }),
      supabase
        .from("clockins")
        .select("user_id, half_day")
        .eq("work_date", date),
      supabase.from("settings").select("daily_rate").single(),
    ]);

  const inSet = new Set((clockins ?? []).map((c) => c.user_id));
  // Which of today's clock-ins were half days.
  const halfSet = new Set(
    (clockins ?? []).filter((c) => c.half_day).map((c) => c.user_id)
  );
  const list = drivers ?? [];
  const worked = list.filter((d) => inSet.has(d.id)).length;
  const notIn = list.length - worked;
  const rate = Number(settings?.daily_rate ?? 100);

  return (
    <div className="flex flex-col gap-6">
      {/* Date picker */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <form method="get" className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
            Date
            <input
              type="date"
              name="date"
              defaultValue={date}
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
        <div className="mt-3 flex gap-4 text-sm">
          <span className="font-semibold text-green-600">{worked} worked</span>
          <span className="font-semibold text-slate-400">{notIn} not in</span>
        </div>
      </section>

      {/* Driver grid */}
      <section className="flex flex-col gap-2">
        {list.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            No drivers yet. Run the seed script (see README).
          </p>
        )}
        {list.map((d) => {
          const isIn = inSet.has(d.id);
          const isHalf = halfSet.has(d.id);
          return (
            <div
              key={d.id}
              className={`flex items-center justify-between rounded-xl p-4 shadow-sm ${
                isIn ? "bg-green-50" : "bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-navy">
                  {d.driver_number ?? "?"}
                </span>
                <span className="font-medium text-slate-800">
                  {d.display_name ?? `Driver ${d.driver_number}`}
                </span>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isHalf
                    ? "bg-amber-500 text-white"
                    : isIn
                      ? "bg-green-600 text-white"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {isHalf ? "Half day" : isIn ? "In" : "Not in"}
              </span>
            </div>
          );
        })}
      </section>

      {/* Daily rate */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Daily rate
        </h2>
        <form action={updateRate} className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate-500">
            Current: {gbp(rate)}
            <input
              type="number"
              name="daily_rate"
              step="0.01"
              min="0"
              defaultValue={rate}
              className="rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-navy"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-navy px-4 py-2 font-semibold text-white"
          >
            Save
          </button>
        </form>
      </section>
    </div>
  );
}
