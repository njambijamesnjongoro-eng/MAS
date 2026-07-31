"use client";

export function PrintButton({ label = "Print receipt" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="medical-button medical-button-primary print:hidden">
      {label}
    </button>
  );
}
