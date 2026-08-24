import React, { useEffect, useState } from "react";
import axios from "axios";

const RECOMMENDED_THRESHOLD = 0.6661;

export default function ThresholdControl({
  api,
  threshold,
  onChange,
}) {
  const [val, setVal] = useState(
    typeof threshold === "number"
      ? threshold
      : RECOMMENDED_THRESHOLD
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof threshold === "number") {
      setVal(threshold);
    }
  }, [threshold]);

  const commit = async (v) => {
    setVal(v);
    setError("");
    setSaving(true);

    try {
      await axios.post(`${api}/threshold/${v}`);

      if (onChange) {
        onChange(v);
      }
    } catch (err) {
      console.error("Failed to update threshold:", err);
      setError("Unable to update threshold.");
    } finally {
      setSaving(false);
    }
  };

  const resetToRecommended = async () => {
    await commit(RECOMMENDED_THRESHOLD);
  };

  const difference = val - RECOMMENDED_THRESHOLD;

  let mode = "Recommended";
  let modeClass = "text-emerald-400";
  let modeDot = "bg-emerald-400";

  if (difference < -0.05) {
    mode = "More Sensitive";
    modeClass = "text-amber-400";
    modeDot = "bg-amber-400";
  } else if (difference > 0.05) {
    mode = "More Conservative";
    modeClass = "text-sky-400";
    modeDot = "bg-sky-400";
  }

  const thresholdPercent = val * 100;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">

      {/* Header */}

      <div className="flex items-start justify-between gap-4">

        <div>
          <div className="flex items-center gap-2">

            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20">
              🎚️
            </span>

            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Detection Threshold
            </span>

          </div>

          <div className={`flex items-center gap-2 mt-2 text-xs font-medium ${modeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${modeDot}`} />
            {mode}
          </div>
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold text-white">
            {thresholdPercent.toFixed(0)}
            <span className="text-lg text-slate-500">
              %
            </span>
          </div>

          <div className="text-[10px] uppercase tracking-wider text-slate-600">
            probability
          </div>
        </div>

      </div>


      {/* Slider */}

      <div className="mt-5">

        <div className="relative">

          <input
            type="range"
            min="0.05"
            max="0.99"
            step="0.01"
            value={val}
            onChange={(e) =>
              commit(Number(e.target.value))
            }
            className="w-full accent-violet-500 cursor-pointer"
          />

        </div>

        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>5%</span>
          <span>99%</span>
        </div>

      </div>


      {/* Recommended value */}

      <div className="mt-4 rounded-xl bg-slate-950/60 border border-slate-800 p-3">

        <div className="flex items-center justify-between gap-3">

          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-600">
              Recommended threshold
            </p>

            <p className="text-sm font-semibold text-slate-300 mt-1">
              {(RECOMMENDED_THRESHOLD * 100).toFixed(1)}%
            </p>
          </div>

          <button
            onClick={resetToRecommended}
            disabled={
              saving ||
              Math.abs(
                val - RECOMMENDED_THRESHOLD
              ) < 0.001
            }
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Reset
          </button>

        </div>

      </div>


      {/* Explanation */}

      <div className="mt-3 text-[11px] leading-relaxed text-slate-500">

        {difference < -0.05 ? (
          <p>
            Lower threshold increases sensitivity and
            produces more potential fraud alerts.
          </p>
        ) : difference > 0.05 ? (
          <p>
            Higher threshold reduces alert volume and
            requires stronger fraud evidence.
          </p>
        ) : (
          <p>
            Current threshold is close to the model's
            recommended operating point.
          </p>
        )}

      </div>


      {/* Status */}

      <div className="mt-3">

        {saving && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Updating live threshold...
          </div>
        )}

        {!saving && !error && (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Live threshold active
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            {error}
          </div>
        )}

      </div>

    </div>
  );
}