import { createClient } from "@/lib/supabase/server";
import { gbp, monthBounds, monthLabel } from "@/lib/utils";
import { addExpense, deleteExpense } from "./actions";

export default async function ExpensesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const { start, end } = monthBounds(now);

  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, expense_date, description, amount")
    .eq("user_id", user!.id)
    .gte("expense_date", start)
    .lte("expense_date", end)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  const total = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Add form */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Add expense
        </h2>
        <form action={addExpense} className="flex flex-col gap-3">
          <input
            name="description"
            placeholder="Description (e.g. Fuel)"
            required
            className="rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-navy"
          />
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="Amount (£)"
            required
            className="rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-navy"
          />
          <button
            type="submit"
            className="rounded-lg bg-navy py-3 font-semibold text-white"
          >
            Add
          </button>
        </form>
      </section>

      {/* Monthly total */}
      <section className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Total this month
          </p>
          <p className="text-xs text-slate-400">{monthLabel(now)}</p>
        </div>
        <p className="text-2xl font-bold text-navy">{gbp(total)}</p>
      </section>

      {/* List */}
      <section className="flex flex-col gap-2">
        {(expenses ?? []).length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            No expenses logged this month.
          </p>
        )}
        {(expenses ?? []).map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-800">
                {e.description}
              </p>
              <p className="text-xs text-slate-400">{e.expense_date}</p>
            </div>
            <div className="flex items-center gap-3 pl-3">
              <span className="font-semibold text-slate-800">
                {gbp(Number(e.amount))}
              </span>
              <form action={deleteExpense}>
                <input type="hidden" name="id" value={e.id} />
                <button
                  type="submit"
                  aria-label="Delete expense"
                  className="text-slate-400 hover:text-red-600"
                >
                  ✕
                </button>
              </form>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
