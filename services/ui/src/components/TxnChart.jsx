import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function TxnChart({data=[]}){
  const series = data.slice(-200).map((d,i)=>({ x:i, y:Number(d.prob||0), amount: d.Amount}));
  
  // Calculate dynamic Y-axis range for better visibility
  const probs = series.map(s => s.y).filter(y => y > 0);
  const minProb = probs.length > 0 ? Math.min(...probs) : 0;
  const maxProb = probs.length > 0 ? Math.max(...probs) : 1;
  const padding = (maxProb - minProb) * 0.1; // 10% padding
  const yMin = Math.max(0, minProb - padding);
  const yMax = Math.min(1, maxProb + padding);
  
  return (
    <div className="h-72">
      {series.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <XAxis dataKey="x" hide />
            <YAxis 
              domain={[yMin, yMax]} 
              tickFormatter={(value) => value.toFixed(4)} 
              label={{ value: 'Fraud Probability', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              labelFormatter={(value) => `Transaction ${value + 1}`}
              formatter={(value, name) => [value.toFixed(6), 'Fraud Probability']}
            />
            <Line 
              type="monotone" 
              dataKey="y" 
              dot={{ fill: '#ef4444', r: 2 }} 
              strokeWidth={3} 
              stroke="#ef4444"
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-slate-400">
          Waiting for transaction data...
        </div>
      )}
    </div>
  );
}
