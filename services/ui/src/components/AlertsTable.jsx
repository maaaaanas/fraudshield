import React from "react";

export default function AlertsTable({rows=[]}){
  return (
    <div className="overflow-auto max-h-[480px]">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-slate-800">
          <tr>
            <th className="text-left p-2">ts</th>
            <th className="text-left p-2">prob</th>
            <th className="text-left p-2">amount</th>
            <th className="text-left p-2">top drivers</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(-50).reverse().map((r,i)=>{
            const drivers = (r.shap || r.top_features_json);
            let top = "";
            try{
              const arr = typeof drivers==="string" ? JSON.parse(drivers) : drivers;
              top = arr.slice(0,3).map(d=>`${d.feature}=${Number(d.contribution).toFixed(3)}`).join(", ");
            }catch{ top = ""; }
            return (
              <tr key={i} className="border-b border-slate-800">
                <td className="p-2">{r.ts || r.timestamp}</td>
                <td className="p-2">{Number(r.prob).toFixed(3)}</td>
                <td className="p-2">{Number(r.amount||r.Amount||0).toFixed(2)}</td>
                <td className="p-2">{top}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
