import { createClient } from "@/lib/supabase/server";
import { gbp, monthBounds, monthLabel, driverCut, DRIVER_SHARE } from "@/lib/utils";
import { JobForm } from "./JobForm";
import { deleteJob } from "./actions";

export default async function JobsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const { start, end } = monthBounds(now);

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, job_date, description, total")
    .eq("user_id", user!.id)
    .gte("job_date", start)
    .lte("job_date", end)
    .order("job_date", { ascending: false })
    .order("created_at", { ascending: false });

  const rows = jobs ?? [];
  const totalPay = rows.reduce((s, j) => s + driverCut(Number(j.total)), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Add form */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-700">
          Add a standby job
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          Enter the job total — you get {Math.round(DRIVER_SHARE * 100)}% of it.
        </p>
        <JobForm />
      </section>

      {/* Monthly total */}
      <section className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Job pay this month
          </p>
          <p className="text-xs text-slate-400">{monthLabel(now)}</p>
        </div>
        <p className="text-2xl font-bold text-navy">{gbp(totalPay)}</p>
      </section>

      {/* List */}
      <section className="flex flex-col gap-2">
        {rows.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            No jobs logged this month.
          </p>
        )}
        {rows.map((j) => {
          const total = Number(j.total);
          const cut = driverCut(total);
          return (
            <div
              key={j.id}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">
                  {j.description || "Job"}
                </p>
                <p className="text-xs text-slate-400">
                  {j.job_date} · total {gbp(total)}
                </p>
              </div>
              <div className="flex items-center gap-3 pl-3">
                <span className="font-semibold text-navy">{gbp(cut)}</span>
                <form action={deleteJob}>
                  <input type="hidden" name="id" value={j.id} />
                  <button
                    type="submit"
                    aria-label="Delete job"
                    className="text-slate-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
