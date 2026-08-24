import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function FraudSummary({
  data = [],
  threshold = 0.5,
}) {
  const recent = data.slice(-200);

  const fraud = recent.filter(
    (d) => Number(d.prob || 0) >= threshold
  ).length;

  const normal = recent.length - fraud;

  const total = recent.length;

  const fraudPercentage =
    total > 0
      ? ((fraud / total) * 100).toFixed(1)
      : "0.0";

  const normalPercentage =
    total > 0
      ? ((normal / total) * 100).toFixed(1)
      : "0.0";

  const chartData = [
    {
      name: "Normal",
      value: normal,
    },
    {
      name: "Fraud Risk",
      value: fraud,
    },
  ];

  return (
    <div className="h-72">

      {recent.length > 0 ? (
        <div className="h-full flex flex-col">

          {/* Summary */}

          <div className="grid grid-cols-2 gap-3 mb-2">

            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />

                <span className="text-xs text-slate-500">
                  Normal
                </span>
              </div>

              <div className="text-xl font-bold mt-1">
                {normalPercentage}%
              </div>

              <div className="text-xs text-slate-600 mt-1">
                {normal.toLocaleString()} transactions
              </div>
            </div>

            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400" />

                <span className="text-xs text-slate-500">
                  Fraud Risk
                </span>
              </div>

              <div className="text-xl font-bold text-red-400 mt-1">
                {fraudPercentage}%
              </div>

              <div className="text-xs text-slate-600 mt-1">
                {fraud.toLocaleString()} transactions
              </div>
            </div>

          </div>

          {/* Chart */}

          <div className="flex-1 min-h-0">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>

                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={45}
                  paddingAngle={3}
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Pie>

                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "10px",
                    color: "#fff",
                  }}
                />

              </PieChart>
            </ResponsiveContainer>

          </div>

          {/* Threshold */}

          <div className="text-center text-xs text-slate-500">
            Active threshold:{" "}
            <span className="text-slate-300 font-semibold">
              {(threshold * 100).toFixed(1)}%
            </span>
          </div>

        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
          Waiting for transaction data...
        </div>
      )}

    </div>
  );
}