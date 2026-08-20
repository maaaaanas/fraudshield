import React, { useState } from "react";
import axios from "axios";

export default function ThresholdControl({api, threshold, onChange}){
  const [val,setVal] = useState(threshold ?? 0.5);
  const commit = async(v)=>{
    setVal(v);
    onChange && onChange(v);
    await axios.post(`${api}/threshold/${v}`);
  };
  return (
    <div className="bg-slate-900 rounded-2xl p-4 shadow">
      <div className="flex items-center justify-between">
        <span className="text-slate-400">Threshold</span>
        <span className="text-xl font-bold">{val.toFixed(2)}</span>
      </div>
      <input type="range" min="0.05" max="0.99" step="0.01"
        value={val} onChange={e=>commit(Number(e.target.value))}
        className="w-full mt-2"/>
      <p className="text-slate-400 text-xs mt-1">Adjusts the fraud probability threshold live.</p>
    </div>
  );
}
