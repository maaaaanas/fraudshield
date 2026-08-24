import React, { useMemo, useState } from "react";

export default function AlertsTable({ rows = [] }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  const parseShap = (value) => {
    try {
      return typeof value === "string"
        ? JSON.parse(value)
        : Array.isArray(value)
          ? value
          : [];
    } catch {
      return [];
    }
  };

  const formatTimestamp = (value) => {
    if (!value) return "—";

    try {
      return new Date(Number(value)).toLocaleString();
    } catch {
      return String(value);
    }
  };

  const getSeverity = (row) => {
    const explicit = String(
      row.severity || ""
    ).toUpperCase();

    if (explicit) return explicit;

    const probability = Number(row.prob || 0);

    if (probability >= 0.95) return "CRITICAL";
    if (probability >= 0.80) return "HIGH";
    if (probability >= 0.50) return "MEDIUM";

    return "LOW";
  };

  const severityStyles = {
    CRITICAL: {
      badge:
        "bg-red-500/10 border-red-500/20 text-red-400",
      dot: "bg-red-400",
    },

    HIGH: {
      badge:
        "bg-orange-500/10 border-orange-500/20 text-orange-400",
      dot: "bg-orange-400",
    },

    MEDIUM: {
      badge:
        "bg-amber-500/10 border-amber-500/20 text-amber-400",
      dot: "bg-amber-400",
    },

    LOW: {
      badge:
        "bg-slate-700/40 border-slate-600 text-slate-400",
      dot: "bg-slate-400",
    },
  };

  const filteredAlerts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows
      .slice(-200)
      .reverse()
      .filter((row) => {
        const severity = getSeverity(row);

        if (
          severityFilter !== "ALL" &&
          severity !== severityFilter
        ) {
          return false;
        }

        if (!query) return true;

        const searchable = [
          row.transaction_id,
          row.customer_id,
          row.merchant,
          row.location,
          row.device_id,
          severity,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      });
  }, [rows, search, severityFilter]);

  const severityCounts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const severity = getSeverity(row);

        if (acc[severity] !== undefined) {
          acc[severity] += 1;
        }

        return acc;
      },
      {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      }
    );
  }, [rows]);

  return (
    <>
      {/* ====================================================
          FILTER BAR
      ==================================================== */}

      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/30">

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">

          {/* Search */}

          <div className="relative flex-1 max-w-xl">

            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              ⌕
            </span>

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search transaction, customer, merchant, location..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500 transition"
            />

          </div>


          {/* Severity filters */}

          <div className="flex flex-wrap gap-2">

            <FilterButton
              active={severityFilter === "ALL"}
              onClick={() =>
                setSeverityFilter("ALL")
              }
              label={`All ${rows.length}`}
            />

            <FilterButton
              active={severityFilter === "CRITICAL"}
              onClick={() =>
                setSeverityFilter("CRITICAL")
              }
              label={`Critical ${severityCounts.CRITICAL}`}
              danger
            />

            <FilterButton
              active={severityFilter === "HIGH"}
              onClick={() =>
                setSeverityFilter("HIGH")
              }
              label={`High ${severityCounts.HIGH}`}
            />

            <FilterButton
              active={severityFilter === "MEDIUM"}
              onClick={() =>
                setSeverityFilter("MEDIUM")
              }
              label={`Medium ${severityCounts.MEDIUM}`}
            />

          </div>

        </div>

      </div>


      {/* ====================================================
          TABLE
      ==================================================== */}

      <div className="overflow-auto max-h-[560px]">

        <table className="min-w-[1050px] w-full text-sm">

          <thead className="sticky top-0 z-10 bg-slate-950">

            <tr className="border-b border-slate-800">

              <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Alert
              </th>

              <th className="text-left px-3 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Probability
              </th>

              <th className="text-left px-3 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Amount
              </th>

              <th className="text-left px-3 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Merchant
              </th>

              <th className="text-left px-3 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Location
              </th>

              <th className="text-left px-3 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Top Drivers
              </th>

              <th className="text-right px-5 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Action
              </th>

            </tr>

          </thead>


          <tbody>

            {filteredAlerts.map((row, index) => {

              const severity = getSeverity(row);

              const styles =
                severityStyles[severity] ||
                severityStyles.LOW;

              const shap = parseShap(
                row.shap ||
                row.top_features_json
              );

              const topDrivers = shap
                .slice(0, 3)
                .map(
                  (driver) =>
                    `${driver.feature} ${Number(
                      driver.contribution
                    ) >= 0 ? "+" : ""}${Number(
                      driver.contribution
                    ).toFixed(2)}`
                )
                .join(" • ");

              const probability =
                Number(row.prob || 0) * 100;

              return (
                <tr
                  key={
                    row.transaction_id ||
                    `${row.ts}-${index}`
                  }
                  onClick={() =>
                    setSelected(row)
                  }
                  className="border-b border-slate-800/80 hover:bg-slate-800/40 cursor-pointer transition"
                >

                  {/* Alert */}

                  <td className="px-5 py-4">

                    <div className="flex items-center gap-3">

                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${styles.dot}`}
                      />

                      <div className="min-w-0">

                        <div className="flex items-center gap-2">

                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold tracking-wide ${styles.badge}`}
                          >
                            {severity}
                          </span>

                        </div>

                        <p className="text-xs font-medium text-slate-300 mt-1 truncate max-w-[180px]">
                          {row.transaction_id ||
                            "Unknown transaction"}
                        </p>

                        <p className="text-[10px] text-slate-600 mt-0.5">
                          {formatTimestamp(
                            row.ts ||
                              row.timestamp
                          )}
                        </p>

                      </div>

                    </div>

                  </td>


                  {/* Probability */}

                  <td className="px-3 py-4">

                    <div className="w-[130px]">

                      <div className="flex justify-between items-center mb-1">

                        <span className="font-semibold text-slate-200">
                          {probability.toFixed(2)}%
                        </span>

                      </div>

                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">

                        <div
                          className={`h-full rounded-full ${
                            probability >= 95
                              ? "bg-red-500"
                              : probability >= 80
                                ? "bg-orange-400"
                                : "bg-amber-400"
                          }`}
                          style={{
                            width: `${Math.min(
                              probability,
                              100
                            )}%`,
                          }}
                        />

                      </div>

                    </div>

                  </td>


                  {/* Amount */}

                  <td className="px-3 py-4">

                    <span className="font-medium text-slate-300">
                      ₹
                      {Number(
                        row.amount ||
                          row.Amount ||
                          0
                      ).toFixed(2)}
                    </span>

                  </td>


                  {/* Merchant */}

                  <td className="px-3 py-4">

                    <div className="text-slate-300 font-medium">
                      {row.merchant || "—"}
                    </div>

                    <div className="text-[10px] text-slate-600 mt-0.5">
                      {row.customer_id || ""}
                    </div>

                  </td>


                  {/* Location */}

                  <td className="px-3 py-4">

                    <span className="text-slate-400">
                      {row.location || "—"}
                    </span>

                  </td>


                  {/* Drivers */}

                  <td className="px-3 py-4">

                    <span className="text-xs text-slate-500">
                      {topDrivers || "—"}
                    </span>

                  </td>


                  {/* Action */}

                  <td className="px-5 py-4 text-right">

                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelected(row);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition"
                    >
                      Investigate →
                    </button>

                  </td>

                </tr>
              );
            })}

          </tbody>

        </table>


        {filteredAlerts.length === 0 && (
          <div className="py-16 text-center">

            <div className="text-3xl mb-3">
              🔎
            </div>

            <p className="text-sm text-slate-400">
              No alerts match your filters.
            </p>

            {(search || severityFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearch("");
                  setSeverityFilter("ALL");
                }}
                className="mt-3 text-xs text-indigo-400 hover:text-indigo-300"
              >
                Clear filters
              </button>
            )}

          </div>
        )}

      </div>


      {/* ====================================================
          INVESTIGATION MODAL
      ==================================================== */}

      {selected && (
        <InvestigationModal
          alert={selected}
          onClose={() => setSelected(null)}
          parseShap={parseShap}
          formatTimestamp={formatTimestamp}
          getSeverity={getSeverity}
          severityStyles={severityStyles}
        />
      )}
    </>
  );
}


/* ============================================================
   FILTER BUTTON
   ============================================================ */

function FilterButton({
  active,
  onClick,
  label,
  danger = false,
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg border text-xs font-medium transition ${
        active
          ? danger
            ? "bg-red-500/10 border-red-500/30 text-red-400"
            : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
          : "bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600"
      }`}
    >
      {label}
    </button>
  );
}


/* ============================================================
   INVESTIGATION MODAL
   ============================================================ */

function InvestigationModal({
  alert,
  onClose,
  parseShap,
  formatTimestamp,
  getSeverity,
  severityStyles,
}) {
  const severity = getSeverity(alert);

  const styles =
    severityStyles[severity] ||
    severityStyles.LOW;

  const probability =
    Number(alert.prob || 0) * 100;

  const shap = parseShap(alert.shap);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >

      <div
        className="bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-auto"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        {/* Modal Header */}

        <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-6 py-5">

          <div className="flex items-start justify-between gap-4">

            <div>

              <div className="flex items-center gap-3">

                <span className="text-xl">
                  🚨
                </span>

                <h2 className="text-xl font-bold">
                  Alert Investigation
                </h2>

                <span
                  className={`px-2.5 py-1 rounded-md border text-[10px] font-bold ${styles.badge}`}
                >
                  {severity}
                </span>

              </div>

              <p className="text-xs text-slate-500 mt-2">
                {alert.transaction_id ||
                  "Transaction details"}
              </p>

            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
            >
              ×
            </button>

          </div>

        </div>


        {/* Modal Body */}

        <div className="p-6">

          {/* Risk Overview */}

          <div className="grid md:grid-cols-3 gap-4">

            <div className="md:col-span-2 rounded-2xl bg-slate-900 border border-slate-800 p-5">

              <div className="flex items-end justify-between gap-4">

                <div>

                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Fraud Probability
                  </p>

                  <p className="text-4xl font-bold text-red-400 mt-2">
                    {probability.toFixed(2)}%
                  </p>

                </div>

                <div className="text-right">

                  <p className="text-xs text-slate-500">
                    Amount
                  </p>

                  <p className="text-xl font-bold text-slate-200 mt-1">
                    ₹
                    {Number(
                      alert.amount ||
                        alert.Amount ||
                        0
                    ).toFixed(2)}
                  </p>

                </div>

              </div>

              <div className="mt-5 h-2 bg-slate-800 rounded-full overflow-hidden">

                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      probability,
                      100
                    )}%`,
                  }}
                />

              </div>

            </div>


            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">

              <p className="text-xs uppercase tracking-wider text-slate-500">
                Alert Status
              </p>

              <div className="flex items-center gap-2 mt-3">

                <span
                  className={`w-2.5 h-2.5 rounded-full ${styles.dot}`}
                />

                <span
                  className={`font-bold ${styles.badge.split(" ").pop()}`}
                >
                  {severity}
                </span>

              </div>

              <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                This transaction exceeded the active
                fraud detection threshold.
              </p>

            </div>

          </div>


          {/* Transaction Details */}

          <div className="mt-5">

            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              Transaction Context
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

              <InfoCard
                label="Transaction ID"
                value={alert.transaction_id}
              />

              <InfoCard
                label="Customer"
                value={alert.customer_id}
              />

              <InfoCard
                label="Merchant"
                value={alert.merchant}
              />

              <InfoCard
                label="Location"
                value={alert.location}
              />

              <InfoCard
                label="Device"
                value={alert.device_id}
              />

              <InfoCard
                label="Timestamp"
                value={formatTimestamp(
                  alert.ts ||
                    alert.timestamp
                )}
              />

            </div>

          </div>


          {/* SHAP Drivers */}

          <div className="mt-6">

            <div className="flex items-center justify-between mb-3">

              <div>
                <h3 className="text-sm font-semibold text-slate-300">
                  Model Explanation
                </h3>

                <p className="text-xs text-slate-600 mt-1">
                  Top features influencing this prediction
                </p>
              </div>

              <span className="text-[10px] uppercase tracking-wider text-slate-600">
                SHAP
              </span>

            </div>

            <div className="space-y-2">

              {shap.length > 0 ? (
                shap.map((driver, index) => {

                  const contribution =
                    Number(
                      driver.contribution
                    );

                  const positive =
                    contribution >= 0;

                  return (
                    <div
                      key={`${driver.feature}-${index}`}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3"
                    >

                      <div className="flex items-center justify-between gap-4">

                        <div className="flex items-center gap-3">

                          <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-[10px] text-slate-500">
                            {index + 1}
                          </span>

                          <span className="font-medium text-slate-300">
                            {driver.feature}
                          </span>

                        </div>

                        <span
                          className={`font-semibold ${
                            positive
                              ? "text-red-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {positive ? "+" : ""}
                          {contribution.toFixed(4)}
                        </span>

                      </div>

                      <div className="mt-2 flex items-center gap-2">

                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">

                          <div
                            className={`h-full rounded-full ${
                              positive
                                ? "bg-red-400"
                                : "bg-emerald-400"
                            }`}
                            style={{
                              width: `${Math.min(
                                Math.abs(
                                  contribution
                                ) * 15,
                                100
                              )}%`,
                            }}
                          />

                        </div>

                        <span className="text-[10px] text-slate-600 w-16 text-right">
                          {positive
                            ? "Raises risk"
                            : "Lowers risk"}
                        </span>

                      </div>

                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-slate-500 py-5 text-center">
                  No model explanation available.
                </div>
              )}

            </div>

          </div>


          {/* Explanation */}

          <div className="mt-6 rounded-xl bg-indigo-500/5 border border-indigo-500/10 p-4">

            <p className="text-xs text-slate-400 leading-relaxed">
              <span className="text-indigo-400 font-semibold">
                How to read this:
              </span>{" "}
              Positive SHAP contributions push the model
              toward a higher fraud probability. Negative
              contributions push the prediction toward a
              lower probability.
            </p>

          </div>

        </div>


        {/* Footer */}

        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">

          <span className="text-xs text-slate-600">
            FraudShield Investigation Workspace
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-300 transition"
          >
            Close Investigation
          </button>

        </div>

      </div>

    </div>
  );
}


/* ============================================================
   INFO CARD
   ============================================================ */

function InfoCard({ label, value }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">

      <div className="text-[10px] uppercase tracking-wider text-slate-600">
        {label}
      </div>

      <div className="text-sm font-semibold text-slate-300 mt-1 break-all">
        {value || "—"}
      </div>

    </div>
  );
}