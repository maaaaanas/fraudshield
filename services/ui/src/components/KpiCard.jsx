export default function KpiCard({label, value}){
  return (
    <div className="bg-slate-900 rounded-2xl p-4 shadow flex flex-col">
      <span className="text-slate-400">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}
