import React from "react";

const accentStyles = {
  default: {
    icon: "bg-slate-800 text-slate-300",
    value: "text-white",
    glow: "",
  },
  red: {
    icon: "bg-red-500/10 text-red-400",
    value: "text-red-400",
    glow: "border-red-500/10",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-400",
    value: "text-amber-400",
    glow: "border-amber-500/10",
  },
  green: {
    icon: "bg-emerald-500/10 text-emerald-400",
    value: "text-emerald-400",
    glow: "border-emerald-500/10",
  },
};

export default function KpiCard({
  label,
  value,
  subtitle,
  icon = "•",
  accent = "default",
}) {
  const styles =
    accentStyles[accent] || accentStyles.default;

  return (
    <div
      className={`bg-slate-900/80 border border-slate-800 ${styles.glow} rounded-2xl p-5 transition-all duration-200 hover:border-slate-700`}
    >
      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0">

          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {label}
          </p>

          <p
            className={`text-3xl font-bold tracking-tight mt-2 ${styles.value}`}
          >
            {value}
          </p>

          {subtitle && (
            <p className="text-xs text-slate-500 mt-2 truncate">
              {subtitle}
            </p>
          )}

        </div>

        <div
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${styles.icon}`}
        >
          {icon}
        </div>

      </div>
    </div>
  );
}