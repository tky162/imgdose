"use client";

import { cn } from "@/lib/cn";

export type ViewMode = "table" | "gallery";

const OPTIONS: Array<{ value: ViewMode; label: string; description: string }> =
  [
    { value: "table", label: "テーブル表示", description: "一覧と詳細情報" },
    { value: "gallery", label: "ギャラリー表示", description: "サムネイル重視" },
  ];

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm",
        className,
      )}
      role="radiogroup"
      aria-label="表示モード切り替え"
    >
      {OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-w-[120px] rounded-full px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
              isActive
                ? "bg-slate-900 text-white shadow"
                : "text-slate-500 hover:text-slate-900",
            )}
            title={option.description}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
