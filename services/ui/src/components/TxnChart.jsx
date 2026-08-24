import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

export default function TxnChart({
  data = [],
  threshold = 0.5,
}) {
  const series = data
    .slice(-200)
    .map((transaction, index) => ({
      index: index + 1,
      probability: Math.max(
        0,
        Math.min(
          1,
          Number(transaction.prob || 0)
        )
      ),
      amount: Number(
        transaction.amount ??
        transaction.Amount ??
        0
      ),
      merchant:
        transaction.merchant || "Unknown merchant",
      transactionId:
        transaction.transaction_id ||
        "Unknown transaction",
    }));

  const hasData = series.length > 0;

  return (
    <div className="h-72">

      {hasData ? (
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <AreaChart
            data={series}
            margin={{
              top: 10,
              right: 12,
              left: 4,
              bottom: 5,
            }}
          >

            <defs>
              <linearGradient
                id="fraudRiskGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#ef4444"
                  stopOpacity={0.25}
                />

                <stop
                  offset="100%"
                  stopColor="#ef4444"
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="#1e293b"
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="index"
              tick={{
                fill: "#64748b",
                fontSize: 10,
              }}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />

            <YAxis
              domain={[0, 1]}
              tickFormatter={(value) =>
                `${Math.round(value * 100)}%`
              }
              tick={{
                fill: "#64748b",
                fontSize: 10,
              }}
              axisLine={false}
              tickLine={false}
              width={42}
            />

            <Tooltip
              cursor={{
                stroke: "#475569",
                strokeWidth: 1,
              }}
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "10px",
                color: "#e2e8f0",
                fontSize: "12px",
              }}
              labelFormatter={(value) =>
                `Transaction ${value}`
              }
              formatter={(value) => [
                `${(
                  Number(value) * 100
                ).toFixed(2)}%`,
                "Fraud probability",
              ]}
              content={({ active, payload }) => {
                if (
                  !active ||
                  !payload ||
                  !payload.length
                ) {
                  return null;
                }

                const item =
                  payload[0].payload;

                return (
                  <div className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 shadow-xl">

                    <div className="text-xs font-semibold text-slate-200">
                      Transaction {item.index}
                    </div>

                    <div className="text-xs text-red-400 font-semibold mt-2">
                      {(item.probability * 100).toFixed(2)}%
                      <span className="text-slate-500 font-normal ml-1">
                        fraud probability
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mt-1">
                      Amount: ₹
                      {item.amount.toFixed(2)}
                    </div>

                    <div className="text-xs text-slate-500 mt-1 truncate max-w-[220px]">
                      {item.merchant}
                    </div>

                  </div>
                );
              }}
            />

            <ReferenceLine
              y={threshold}
              stroke="#a78bfa"
              strokeDasharray="6 4"
              label={{
                value: `Threshold ${(threshold * 100).toFixed(0)}%`,
                position: "insideTopRight",
                fill: "#a78bfa",
                fontSize: 10,
              }}
            />

            <Area
              type="monotone"
              dataKey="probability"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#fraudRiskGradient)"
              dot={false}
              activeDot={{
                r: 4,
                strokeWidth: 2,
                stroke: "#0f172a",
                fill: "#ef4444",
              }}
            />

          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
          Waiting for transaction data...
        </div>
      )}

    </div>
  );
}