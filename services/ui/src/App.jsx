import React, { useEffect, useState } from "react";
import axios from "axios";
import KpiCard from "./components/KpiCard.jsx";
import AlertsTable from "./components/AlertsTable.jsx";
import TxnChart from "./components/TxnChart.jsx";
import ThresholdControl from "./components/ThresholdControl.jsx";
import { onSSE } from "./lib/sse.js";

const API = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function App(){
  const [latest,setLatest] = useState([]);
  const [alerts,setAlerts] = useState([]);
  const [threshold,setThreshold] = useState(0.5);
  const [counts,setCounts] = useState({total_transactions: 0, total_alerts: 0});

  const loadAll = async ()=>{
    const [l,a,t,c] = await Promise.all([
      axios.get(`${API}/transactions?limit=200`).then(r=>r.data),
      axios.get(`${API}/alerts?limit=200`).then(r=>r.data),
      axios.get(`${API}/threshold`).then(r=>r.data),
      axios.get(`${API}/counts`).then(r=>r.data)
    ]);
    setLatest(l); setAlerts(a); setThreshold(t.threshold ?? 0.5); setCounts(c);
  };

  useEffect(()=>{
    loadAll();
    const unsub1 = onSSE(`${API}/stream/transactions`, loadAll);
    const unsub2 = onSSE(`${API}/stream/alerts`, loadAll);
    return ()=>{ unsub1(); unsub2(); };
  },[]);

  const totalTx = counts.total_transactions;
  const totalAlerts = counts.total_alerts;
  const alertRate = totalTx > 0 ? ((totalAlerts / totalTx) * 100).toFixed(1) : "0.0";
  const avgProb = alerts.length
  ? (alerts.reduce((s, a) => s + Number(a.prob), 0) / alerts.length).toFixed(3)
  : "0.000";
  
  return (
    <div className="min-h-screen p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">💳 Real-Time Fraud Monitoring</h1>
        <p className="text-slate-400">Kafka → Model → API (SSE) → React Dashboard</p>
      </header>

      <div className="grid md:grid-cols-4 gap-4">
        <KpiCard label="Total Transactions" value={totalTx}/>
        <KpiCard label="🚨 Total Alerts" value={totalAlerts}/>
        <KpiCard label="Alert Rate" value={`${alertRate}%`}/>
        <ThresholdControl api={API} threshold={threshold} onChange={setThreshold}/>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <div className="bg-slate-900 rounded-2xl p-4 shadow">
          <h2 className="font-semibold mb-2">Recent Transactions</h2>
          <TxnChart data={latest}/>
        </div>
        <div className="bg-slate-900 rounded-2xl p-4 shadow">
          <h2 className="font-semibold mb-2">🚨 Recent Alerts ({totalAlerts} total)</h2>
          {totalAlerts > 0 ? (
            <AlertsTable rows={alerts}/>
          ) : (
            <div className="text-center text-slate-400 py-8">
              No fraud alerts detected yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
