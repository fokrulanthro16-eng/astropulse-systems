"use client";

import React from "react";
import { 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle, 
  ShieldCheck, 
  Activity, 
  Zap,
  ArrowRight,
  ClipboardList
} from "lucide-react";
import { AnomalyRecord, AnomalySeverity } from "@/lib/types";

interface AnomalyAlertBannerProps {
  overallStatus: AnomalySeverity;
  anomalies: AnomalyRecord[];
  mlConfidencePct?: number;
  primaryVector?: string;
  onOpenChecklist: () => void;
}

export const AnomalyAlertBanner: React.FC<AnomalyAlertBannerProps> = ({
  overallStatus,
  anomalies,
  mlConfidencePct,
  primaryVector,
  onOpenChecklist,
}) => {
  if (overallStatus === "NOMINAL" || anomalies.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-300">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-900/60 border border-emerald-600/50 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-mono font-bold text-sm tracking-wide text-emerald-200 flex items-center gap-2">
              <span>ALL BIOMETRIC VECTORS NOMINAL</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <p className="text-xs text-emerald-400/80 font-mono">
              On-Device Edge ML IsolationForest & Clinical Z-Scores within safe envelope (σ &lt; 1.5).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-emerald-300 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>EDGE ML: {mlConfidencePct ? mlConfidencePct.toFixed(1) : "8.4"}% DEV</span>
          </div>

          <button
            onClick={onOpenChecklist}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <ClipboardList className="w-3.5 h-3.5 text-cyan-400" />
            <span>CLINICAL SOP</span>
          </button>
        </div>
      </div>
    );
  }

  const primaryAnomaly = anomalies[0];
  const isCritical = overallStatus === "CRITICAL" || primaryAnomaly.severity === "CRITICAL";

  return (
    <div
      className={`rounded-xl p-5 border transition-all ${
        isCritical
          ? "border-red-500 bg-red-950/40 glow-crimson animate-alert-fast"
          : "border-amber-500 bg-amber-950/30 glow-amber"
      }`}
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Icon & Alert Heading */}
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-xl border text-white flex-shrink-0 ${
              isCritical
                ? "bg-red-600 border-red-400 animate-bounce"
                : "bg-amber-600 border-amber-400"
            }`}
          >
            {isCritical ? (
              <AlertOctagon className="w-7 h-7" />
            ) : (
              <AlertTriangle className="w-7 h-7 text-black" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`font-mono text-xs font-black px-2.5 py-0.5 rounded tracking-widest uppercase ${
                  isCritical
                    ? "bg-red-600 text-white"
                    : "bg-amber-400 text-black font-bold"
                }`}
              >
                {isCritical ? "CRITICAL EMERGENCY" : "CAUTION ADVISORY"}
              </span>

              <span className="font-mono text-xs text-slate-300 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700">
                PROTOCOL: {primaryAnomaly.protocol_code}
              </span>

              {/* Edge ML Confidence Badge */}
              <span className="font-mono text-xs text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-800 flex items-center gap-1.5 font-bold">
                <Zap className="w-3 h-3 text-cyan-400 animate-pulse" />
                EDGE ML CONFIDENCE: {primaryAnomaly.ml_confidence_pct ?? (primaryAnomaly.confidence_score * 100).toFixed(0)}%
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1.5 uppercase font-mono">
              {primaryAnomaly.title}
            </h2>

            <p className="text-sm text-slate-200 mt-1 max-w-4xl font-sans">
              {primaryAnomaly.description}
            </p>

            {/* Pathophysiology & Primary ML Driver */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 font-mono text-xs">
              <div className="text-rose-300/90 bg-black/40 px-3 py-1.5 rounded-lg border border-red-900/60 inline-flex items-center gap-2">
                <span className="font-bold text-red-400 uppercase tracking-wider">Pathophysiology:</span>
                <span>{primaryAnomaly.physiological_impact}</span>
              </div>

              {primaryVector && (
                <div className="text-amber-300 bg-black/40 px-3 py-1.5 rounded-lg border border-amber-900/60 inline-flex items-center gap-2">
                  <span className="font-bold text-amber-400 uppercase tracking-wider">Primary Driver:</span>
                  <span>{primaryVector}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Direct Action CTA */}
        <button
          onClick={onOpenChecklist}
          className={`px-5 py-3 rounded-xl font-mono text-sm font-bold tracking-wider uppercase transition-all flex items-center gap-2 shadow-lg flex-shrink-0 ${
            isCritical
              ? "bg-white text-red-950 hover:bg-slate-200 border-2 border-red-400 glow-crimson"
              : "bg-amber-400 text-black hover:bg-amber-300 border-2 border-amber-300"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>VIEW EMERGENCY PROTOCOL</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Trigger Metrics Pills */}
      <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-wrap items-center gap-2 font-mono text-xs">
        <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
          Breached Biomarkers:
        </span>
        {Object.entries(primaryAnomaly.trigger_metrics).map(([k, v]) => (
          <span
            key={k}
            className="px-2.5 py-1 rounded-md bg-black/60 border border-red-500/50 text-red-300 font-bold tabular-nums"
          >
            {k.toUpperCase()}: {typeof v === "number" ? v.toFixed(1) : v}
          </span>
        ))}
      </div>
    </div>
  );
};
