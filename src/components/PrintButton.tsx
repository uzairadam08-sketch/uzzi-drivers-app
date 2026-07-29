"use client";

// Triggers the browser's print dialog (which can also "Save as PDF").
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white print:hidden"
    >
      Print / Save as PDF
    </button>
  );
}
