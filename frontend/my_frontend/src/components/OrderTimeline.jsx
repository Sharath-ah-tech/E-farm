import { memo } from "react";
import { ALL_STEPS, STATUS_STEP_MAP } from "../utils/orderStatus";

export { ALL_STEPS, STATUS_STEP_MAP };

export function StatusProgressBar({ currentStep, total = ALL_STEPS.length }) {
  const pct = total <= 1 ? 100 : (currentStep / (total - 1)) * 100;
  return (
    <div className="relative h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
      <div className="h-full bg-green-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}

const OrderTimeline = memo(function OrderTimeline({ status, compact = false }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
        <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 shadow-md">
          <span className="material-symbols-outlined text-white text-lg">cancel</span>
        </div>
        <div>
          <p className="font-bold text-red-700 dark:text-red-400">Order Cancelled</p>
          <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">This order was cancelled and will not be fulfilled.</p>
        </div>
      </div>
    );
  }

  if (status === "returned") {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700">
        <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-white text-lg">keyboard_return</span>
        </div>
        <div>
          <p className="font-bold text-gray-700 dark:text-gray-300">Order Returned</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Your return has been accepted. Refund will be processed.</p>
        </div>
      </div>
    );
  }

  // Derived directly from the backend status string — never hardcoded.
  const currentIdx = STATUS_STEP_MAP[status] ?? 0;

  if (compact) {
    return (
      <div className="flex items-center gap-0.5">
        {ALL_STEPS.map((step, idx) => {
          const done = idx <= currentIdx;
          const current = idx === currentIdx;
          return (
            <div key={step.key} className="flex items-center">
              <div title={step.label} className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                done ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-600"
              } ${current ? "ring-2 ring-green-300 dark:ring-green-800 scale-110" : ""}`}>
                <span className="material-symbols-outlined text-xs">{done && !current ? "check" : step.icon}</span>
              </div>
              {idx < ALL_STEPS.length - 1 && (
                <div className={`h-0.5 w-3 md:w-4 transition-all duration-500 ${idx < currentIdx ? "bg-green-500" : "bg-gray-200 dark:bg-slate-700"}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const progressPct = currentIdx > 0 ? `${(currentIdx / (ALL_STEPS.length - 1)) * 100}%` : "0%";

  return (
    <div className="relative pl-2">
      <div className="absolute left-7 top-5 bottom-5 w-0.5 bg-gray-200 dark:bg-slate-700" />
      <div className="absolute left-7 top-5 w-0.5 bg-green-500 transition-all duration-700 ease-out" style={{ height: progressPct }} />
      <div className="space-y-5 md:space-y-6">
        {ALL_STEPS.map((step, idx) => {
          const done = idx <= currentIdx;
          const current = idx === currentIdx;
          return (
            <div key={step.key} className="relative flex items-start gap-3 md:gap-4">
              <div className={`relative z-10 w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                done ? "bg-green-500 text-white shadow-md shadow-green-200/60 dark:shadow-green-900/40" : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-600"
              } ${current ? "ring-4 ring-green-200 dark:ring-green-900" : ""}`}>
                <span className="material-symbols-outlined text-base md:text-lg">{done && !current ? "check" : step.icon}</span>
              </div>
              <div className={`pt-1 flex-1 ${done ? "" : "opacity-40"}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-bold leading-tight ${done ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                    {step.label}
                  </p>
                  {current && (
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default OrderTimeline;