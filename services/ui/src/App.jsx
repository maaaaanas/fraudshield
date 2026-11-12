import React, { useEffect, useState } from "react";
import axios from "axios";

import KpiCard from "./components/KpiCard.jsx";
import AlertsTable from "./components/AlertsTable.jsx";
import TxnChart from "./components/TxnChart.jsx";
import FraudSummary from "./components/FraudSummary.jsx";
import ThresholdControl from "./components/ThresholdControl.jsx";
import ModelDriftPanel from "./components/ModelDriftPanel.jsx";


const API = "/api";

export default function App() {
  const [latest, setLatest] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [threshold, setThreshold] = useState(0.5);

  const [counts, setCounts] = useState({
    total_transactions: 0,
    total_alerts: 0,
  });

  const [model, setModel] = useState(null);
  const [drift, setDrift] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadAll = async () => {
    try {
      const [
        latestResponse,
        alertsResponse,
        thresholdResponse,
        countsResponse,
        modelResponse,
        driftResponse,
      ] = await Promise.all([
        axios.get(`${API}/transactions?limit=200`),
        axios.get(`${API}/alerts?limit=200`),
        axios.get(`${API}/threshold`),
        axios.get(`${API}/counts`),
        axios.get(`${API}/model`),
        axios.get(`${API}/drift`),
      ]);

      setLatest(latestResponse.data);
      setAlerts(alertsResponse.data);

      setThreshold(
        thresholdResponse.data.threshold ?? 0.5
      );

      setCounts(countsResponse.data);
      setModel(modelResponse.data);
      setDrift(driftResponse.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error(
        "Dashboard refresh failed:",
        error
      );
    }
  };

  useEffect(() => {
    loadAll();

    const interval = window.setInterval(loadAll, 10000);

    return () => window.clearInterval(interval);
  }, []);

  const totalTx =
    counts.total_transactions || 0;

  const totalAlerts =
    counts.total_alerts || 0;

  const alertRate =
    totalTx > 0
      ? ((totalAlerts / totalTx) * 100).toFixed(1)
      : "0.0";

  const criticalAlerts = alerts.filter(
    (alert) =>
      String(alert.severity || "").toUpperCase() ===
      "CRITICAL"
  ).length;

  const highAlerts = alerts.filter((alert) => {
  const severity = String(
    alert.severity || ""
  ).toUpperCase();

  if (severity) {
    return severity === "HIGH";
  }

  const probability = Number(
    alert.prob || 0
  );

  return probability >= 0.80 && probability < 0.95;
});

  const systemOnline = true;

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* ======================================================
          TOP HEADER
      ====================================================== */}

      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="max-w-[1600px] mx-auto px-6 py-5">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            <div>
              <div className="flex items-center gap-3">

                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <span className="text-2xl">
                    🛡️
                  </span>
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    FraudShield
                  </h1>

                  <p className="text-sm text-slate-400">
                    Real-time fraud intelligence
                  </p>
                </div>

              </div>
            </div>

            <div className="flex items-center gap-3">

              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                </span>

                <span className="text-sm font-medium text-emerald-400">
                  SYSTEM OPERATIONAL
                </span>
              </div>

              {lastUpdated && (
                <span className="hidden md:block text-xs text-slate-500">
                  Updated{" "}
                  {lastUpdated.toLocaleTimeString()}
                </span>
              )}

            </div>

          </div>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
            <span>Kafka Streaming</span>
            <span>•</span>
            <span>ML Detection</span>
            <span>•</span>
            <span>SHAP Explainability</span>
            <span>•</span>
            <span>Cloudflare D1 Monitoring</span>
          </div>

        </div>
      </header>


      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="max-w-[1600px] mx-auto px-6 py-6">

        {/* ====================================================
            KPI ROW
        ==================================================== */}

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

          <KpiCard
            label="Transactions Processed"
            value={totalTx.toLocaleString()}
            subtitle="All monitored transactions"
            icon="↗"
          />

          <KpiCard
            label="Fraud Alerts"
            value={totalAlerts.toLocaleString()}
            subtitle={`${criticalAlerts} critical in recent window`}
            icon="🚨"
            accent="red"
          />

          <KpiCard
            label="Alert Rate"
            value={`${alertRate}%`}
            subtitle={`${highAlerts} high-risk recent alerts`}
            icon="%"
            accent="amber"
          />

          <ThresholdControl
            api={API}
            threshold={threshold}
            onChange={setThreshold}
          />

        </section>


        {/* ====================================================
            RISK MONITORING
        ==================================================== */}

        <section className="grid xl:grid-cols-[1.7fr_1fr] gap-4 mt-4">

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">

            <div className="px-5 py-4 border-b border-slate-800">

              <div className="flex items-center justify-between">

                <div>
                  <h2 className="font-semibold text-lg">
                    Risk Activity
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    Fraud probability across recent transactions
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Fraud probability
                </div>

              </div>

            </div>

            <div className="p-4">
             <TxnChart
               data={latest}
               threshold={threshold}
             />
            </div>

          </div>


          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">

            <div className="px-5 py-4 border-b border-slate-800">

              <h2 className="font-semibold text-lg">
                Risk Distribution
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                Recent transactions by active threshold
              </p>

            </div>

            <div className="p-4">
              <FraudSummary
                data={latest}
                threshold={threshold}
              />
            </div>

          </div>

        </section>


        {/* ====================================================
            MODEL INTELLIGENCE
        ==================================================== */}

        <section className="mt-4">

          <ModelDriftPanel
            model={model}
            drift={drift}
          />

        </section>


        {/* ====================================================
            ALERT QUEUE
        ==================================================== */}

        <section className="mt-4 bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">

          <div className="px-5 py-4 border-b border-slate-800">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

              <div>
                <div className="flex items-center gap-3">

                  <h2 className="font-semibold text-lg">
                    Live Alert Queue
                  </h2>

                  <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    LIVE
                  </span>

                </div>

                <p className="text-xs text-slate-500 mt-1">
                  Click an alert to open the investigation workspace
                </p>
              </div>

              <div className="text-sm text-slate-400">
                <span className="text-white font-semibold">
                  {totalAlerts.toLocaleString()}
                </span>{" "}
                total alerts
              </div>

            </div>

          </div>

          {totalAlerts > 0 ? (
            <AlertsTable rows={alerts} />
          ) : (
            <div className="py-16 text-center">

              <div className="text-4xl mb-3">
                ✓
              </div>

              <h3 className="font-semibold text-slate-300">
                No fraud alerts detected
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                The monitoring pipeline is active.
              </p>

            </div>
          )}

        </section>


        {/* ====================================================
            FOOTER
        ==================================================== */}

        <footer className="py-8 text-center text-xs text-slate-600">
          FraudShield • Real-time fraud detection and investigation platform
        </footer>

      </main>

    </div>
  );
}
