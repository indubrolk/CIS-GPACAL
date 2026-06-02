"use client";

import { cn } from "@/lib/utils";

const STEPS = [
  { num: 1, label: "Subject Details" },
  { num: 2, label: "Upload & OCR" },
  { num: 3, label: "Review & Edit" },
  { num: 4, label: "Success" },
];

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.num} className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-all duration-300",
              current === step.num
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110"
                : current > step.num
                ? "bg-blue-600/20 text-blue-400 border-2 border-blue-500"
                : "bg-slate-800 text-slate-500 border border-slate-700"
            )}
          >
            {current > step.num ? "✓" : step.num}
          </div>
          <span
            className={cn(
              "text-sm font-medium hidden sm:inline transition-colors",
              current === step.num
                ? "text-blue-400"
                : current > step.num
                ? "text-slate-400"
                : "text-slate-600"
            )}
          >
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "w-8 h-0.5 mx-1 transition-colors",
                current > step.num ? "bg-blue-500" : "bg-slate-700"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
