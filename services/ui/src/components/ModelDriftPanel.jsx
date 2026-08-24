import React from "react";

function Metric({ label, value, tone = "default" }) {
  const valueClass = {
    default: "text-white",
    good: "text-emerald-400",
    warning: "text-amber-400",
    danger: "text-red-400",
  }[tone] || "text-white";

  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-3">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">
        {label}
      </div>

      <div className={`text-lg font-bold mt-1 ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

function getDriftStatus(status) {
  const normalized = String(status || "unknown").toLowerCase();

  if (normalized === "high") {
    return {
      label: "HIGH DRIFT",
      tone: "danger",
      dot: "bg-red-400",
      text: "text-red-400",
      description: "Model behavior requires attention",
    };
  }

  if (
    normalized === "elevated" ||
    normalized === "medium"
  ) {
    return {
      label: "ELEVATED",
      tone: "warning",
      dot: "bg-amber-400",
      text: "text-amber-400",
      description: "Model behavior is changing",
    };
  }

  if (normalized === "no_data") {
    return {
      label: "NO DATA",
      tone: "warning",
      dot: "bg-slate-400",
      text: "text-slate-400",
      description: "Waiting for monitoring data",
    };
  }

  return {
    label: "STABLE",
    tone: "good",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    description: "Model behavior within baseline",
  };
}

export default function ModelDriftPanel({
  model,
  drift,
}) {
  if (!model || !drift) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            🧠
          </div>

          <div>
            <h2 className="font-semibold text-lg">
              Model Intelligence
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Loading model performance and drift data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const driftInfo = getDriftStatus(
    drift.drift_status
  );

  const driftRatio = Number(
    drift.drift_ratio ?? 0
  );

  const rollingAlertRate =
    Number(drift.rolling_alert_rate ?? 0) * 100;

  const baselineFraudRate =
    Number(drift.baseline_fraud_rate ?? 0) * 100;

  const modelThreshold = Number(
    model.threshold ?? 0
  );

  return (
    <div className="grid xl:grid-cols-2 gap-4">

      {/* ====================================================
          MODEL PERFORMANCE
      ==================================================== */}

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">

        <div className="px-5 py-4 border-b border-slate-800">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              🧠
            </div>

            <div className="min-w-0">
              <h2 className="font-semibold text-lg">
                Model Intelligence
              </h2>

              <p className="text-xs text-slate-500 mt-1 truncate">
                {model.model || "Fraud detection model"}
              </p>
            </div>

          </div>

        </div>

        <div className="p-5">

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

            <Metric
              label="F1 Score"
              value={Number(
                model.f1 ?? 0
              ).toFixed(4)}
              tone="good"
            />

            <Metric
              label="PR-AUC"
              value={Number(
                model.pr_auc ?? 0
              ).toFixed(4)}
              tone="good"
            />

            <Metric
              label="Model Threshold"
              value={modelThreshold.toFixed(4)}
            />

            <Metric
              label="Training Samples"
              value={Number(
                model.n_train ?? 0
              ).toLocaleString()}
            />

            <Metric
              label="Test Samples"
              value={Number(
                model.n_test ?? 0
              ).toLocaleString()}
            />

            <Metric
              label="Training Fraud Rate"
              value={`${Number(
                model.fraud_rate_pct ?? 0
              ).toFixed(2)}%`}
            />

          </div>

          <div className="mt-4 rounded-xl bg-slate-950/60 border border-slate-800 p-4">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Detection Engine
                </p>

                <p className="text-sm font-medium text-slate-300 mt-1">
                  Ensemble fraud classifier
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                ACTIVE
              </div>

            </div>

          </div>

        </div>

      </div>


      {/* ====================================================
          DRIFT MONITORING
      ==================================================== */}

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">

        <div className="px-5 py-4 border-b border-slate-800">

          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                📡
              </div>

              <div>
                <h2 className="font-semibold text-lg">
                  Drift Monitoring
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  Live model behavior monitoring
                </p>
              </div>

            </div>

            <div className={`flex items-center gap-2 ${driftInfo.text}`}>

              <span
                className={`w-2 h-2 rounded-full ${driftInfo.dot}`}
              />

              <span className="text-xs font-bold">
                {driftInfo.label}
              </span>

            </div>

          </div>

        </div>

        <div className="p-5">

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

            <Metric
              label="Window Size"
              value={Number(
                drift.window_size ?? 0
              ).toLocaleString()}
            />

            <Metric
              label="Drift Ratio"
              value={driftRatio.toFixed(2)}
              tone={
                driftInfo.tone === "danger"
                  ? "danger"
                  : driftInfo.tone === "warning"
                    ? "warning"
                    : "good"
              }
            />

            <Metric
              label="Rolling Alert Rate"
              value={`${rollingAlertRate.toFixed(2)}%`}
            />

            <Metric
              label="Baseline Fraud Rate"
              value={`${baselineFraudRate.toFixed(2)}%`}
            />

            <Metric
              label="Mean Score"
              value={Number(
                drift.mean_score ?? 0
              ).toFixed(4)}
            />

            <Metric
              label="P95 Score"
              value={Number(
                drift.p95_score ?? 0
              ).toFixed(4)}
            />

          </div>

          <div className="mt-4 rounded-xl bg-slate-950/60 border border-slate-800 p-4">

            <div className="flex items-center justify-between gap-4">

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Monitoring Status
                </p>

                <p className={`text-sm font-medium mt-1 ${driftInfo.text}`}>
                  {driftInfo.description}
                </p>
              </div>

              <span className="text-xs text-slate-600">
                LIVE
              </span>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}