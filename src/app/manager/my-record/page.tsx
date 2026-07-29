import { createClient } from "@/lib/supabase/server";
import { gbp, toISODate } from "@/lib/utils";
import { PrintButton } from "@/components/PrintButton";
import { addPay, deletePay } from "./actions";

const isISODate = (s?: string): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

const prettyDate = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const monthKey = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

// Saturdays are a half working day for managers; every other worked day
// counts as a full day. (Sundays are simply never recorded.)
const isSaturday = (s: string) => new Date(s + "T00:00:00").getDay() === 6;
const dayValue = (s: string) => (isSaturday(s) ? 0.5 : 1);

// Format a day total that may end in .5 as e.g. "137½".
const fmtDays = (n: number) =>
  Number.isInteger(n) ? String(n) : `${Math.floor(n)}½`;

// Defaults: 1 July 2026 to 31 December 2026.
const DEFAULT_FROM = "2026-07-01";
const DEFAULT_TO = "2026-12-31";

export default async function MyRecord({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const supabase = createClient();

  const from = isISODate(searchParams.from) ? searchParams.from : DEFAULT_FROM;
  const to = isISODate(searchParams.to) ? searchParams.to : DEFAULT_TO;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: clockins }, { data: payRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user?.id ?? "")
        .single(),
      supabase
        .from("clockins")
        .select("work_date")
        .eq("user_id", user?.id ?? "")
        .gte("work_date", from)
        .lte("work_date", to)
        .order("work_date", { ascending: true }),
      supabase
        .from("manager_pay")
        .select("id, pay_date, amount, note")
        .eq("user_id", user?.id ?? "")
        .gte("pay_date", from)
        .lte("pay_date", to)
        .order("pay_date", { ascending: false }),
    ]);

  const days = clockins ?? [];
  const pay = payRows ?? [];
  // Sum of day-values: full weekdays + half Saturdays.
  const totalDays = days.reduce((s, c) => s + dayValue(c.work_date), 0);
  const name = profile?.display_name ?? "Manager";
  const totalPay = pay.reduce((s, p) => s + Number(p.amount), 0);
  const today = toISODate(new Date());

  // Group the worked dates by month for a tidy printout.
  const byMonth = new Map<string, string[]>();
  for (const c of days) {
    const k = monthKey(c.work_date);
    if (!byMonth.has(k)) byMonth.set(k, []);
    byMonth.get(k)!.push(c.work_date);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Date range picker — hidden when printing */}
      <section className="rounded-2xl bg-white p-5 shadow-sm print:hidden">
        <form method="get" className="flex flex-wrap items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
            From
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-navy"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
            To
            <input
              type="date"
              name="to"
              defaultValue={to}
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
      </section>

      {/* The record itself — this is what prints */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-navy">Work Record</h2>
            <p className="text-sm text-slate-600">{name}</p>
            <p className="text-sm text-slate-500">
              {prettyDate(from)} &ndash; {prettyDate(to)}
            </p>
          </div>
          <PrintButton />
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Days worked
            </p>
            <p className="text-2xl font-bold text-navy tabular-nums">
              {fmtDays(totalDays)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Pay logged
            </p>
            <p className="text-2xl font-bold text-navy tabular-nums">
              {gbp(totalPay)}
            </p>
          </div>
        </div>

        {/* ---- Pay log ---- */}
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Pay log</h3>

        {/* Add-pay form — hidden when printing */}
        <form
          action={addPay}
          className="mb-3 flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3 print:hidden"
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Date
            <input
              type="date"
              name="pay_date"
              defaultValue={today}
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Amount (£)
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-slate-600">
            Note (optional)
            <input
              type="text"
              name="note"
              placeholder="e.g. week 1"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
          >
            Log pay
          </button>
        </form>

        {pay.length === 0 ? (
          <p className="mb-5 py-3 text-center text-sm text-slate-400">
            No pay logged yet for this period.
          </p>
        ) : (
          <div className="mb-5 overflow-hidden rounded-xl border border-slate-100">
            {pay.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-0"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-slate-800 tabular-nums">
                    {gbp(Number(p.amount))}
                  </span>
                  <span className="text-xs text-slate-400">
                    {prettyDate(p.pay_date)}
                    {p.note ? ` · ${p.note}` : ""}
                  </span>
                </div>
                <form action={deletePay} className="print:hidden">
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="rounded-md px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        {/* ---- Attendance (proof of days) ---- */}
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          Days worked
        </h3>
        {totalDays === 0 ? (
          <p className="py-3 text-center text-sm text-slate-400">
            No recorded days in this period.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {[...byMonth.entries()].map(([month, dates]) => (
              <div key={month}>
                <h4 className="mb-2 border-b border-slate-100 pb-1 text-sm font-semibold text-slate-700">
                  {month}{" "}
                  <span className="font-normal text-slate-400">
                    ({fmtDays(dates.reduce((s, d) => s + dayValue(d), 0))} days)
                  </span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {dates.map((d) => (
                    <span
                      key={d}
                      className="rounded-md bg-green-50 px-2 py-1 text-xs text-slate-700"
                    >
                      {prettyDate(d)}
                      {isSaturday(d) && (
                        <span className="ml-1 font-semibold text-green-700">
                          · ½ day
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-xs text-slate-400">
          Days shown as worked · Saturdays count as ½ a day · pay logged
          manually as paid.
        </p>
      </section>
    </div>
  );
}
