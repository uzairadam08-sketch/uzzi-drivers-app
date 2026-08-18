"use client";

import { useRef, useState } from "react";
import { gbp, driverCut, DRIVER_SHARE } from "@/lib/utils";
import { addJob } from "./actions";

export function JobForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [total, setTotal] = useState(0);
  const [expenses, setExpenses] = useState(0);

  const net = Math.max(0, total - expenses);
  const cut = total > 0 ? driverCut(total, expenses) : 0;

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await addJob(fd);
        formRef.current?.reset();
        setTotal(0);
        setExpenses(0);
      }}
      className="flex flex-col gap-3"
    >
      <input
        name="description"
        placeholder="Job / car reg (optional)"
        className="rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-navy"
      />
      <input
        name="total"
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        placeholder="Job total (£)"
        required
        onInput={(e) => {
          const n = Number((e.target as HTMLInputElement).value);
          setTotal(Number.isFinite(n) && n > 0 ? n : 0);
        }}
        className="rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-navy"
      />
      <input
        name="expenses"
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        placeholder="Expenses (£) — covered by company"
        onInput={(e) => {
          const n = Number((e.target as HTMLInputElement).value);
          setExpenses(Number.isFinite(n) && n > 0 ? n : 0);
        }}
        className="rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-navy"
      />

      <div className="rounded-lg bg-slate-50 p-4 space-y-1">
        {expenses > 0 && (
          <div className="flex justify-between text-xs text-slate-400">
            <span>Net (after expenses)</span>
            <span>{gbp(net)}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Your {Math.round(DRIVER_SHARE * 100)}% cut
          </p>
          <p className="text-2xl font-bold text-navy">{gbp(cut)}</p>
        </div>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-navy py-3 font-semibold text-white"
      >
        Add per car job
      </button>
    </form>
  );
}
