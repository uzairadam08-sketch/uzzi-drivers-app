"use client";

import { useRef, useState } from "react";
import { gbp, driverCut, DRIVER_SHARE } from "@/lib/utils";
import { addJob } from "./actions";

// Live-preview form: as the driver types the job total, they see their
// 70% cut update instantly, then save it.
export function JobForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [cut, setCut] = useState(0);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await addJob(fd);
        formRef.current?.reset();
        setCut(0);
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
          setCut(Number.isFinite(n) && n > 0 ? driverCut(n) : 0);
        }}
        className="rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-navy"
      />

      <div className="rounded-lg bg-slate-50 p-4 text-center">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Your {Math.round(DRIVER_SHARE * 100)}% cut
        </p>
        <p className="mt-1 text-3xl font-bold text-navy">{gbp(cut)}</p>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-navy py-3 font-semibold text-white"
      >
        Add job
      </button>
    </form>
  );
}
