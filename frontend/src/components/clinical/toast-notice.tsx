"use client";

type ToastNoticeProps = {
  message: string;
  tone?: "success" | "error";
  onClose: () => void;
};

export function ToastNotice({ message, tone = "success", onClose }: ToastNoticeProps) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-800";

  return (
    <div className={`fixed right-5 top-5 z-50 max-w-sm rounded-2xl border px-4 py-3 shadow-lg ${toneClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm font-medium">{message}</div>
        <button type="button" onClick={onClose} className="text-xs uppercase tracking-[0.14em]">
          Close
        </button>
      </div>
    </div>
  );
}
