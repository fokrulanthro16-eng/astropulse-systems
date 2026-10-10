"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckSquare, 
  Square, 
  ShieldAlert, 
  Clock, 
  Cpu, 
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Flame
} from "lucide-react";
import { AnomalyRecord } from "@/lib/types";

interface CountermeasuresCardProps {
  anomalies: AnomalyRecord[];
}

export const CountermeasuresCard: React.FC<CountermeasuresCardProps> = ({ anomalies }) => {
  // Store completed steps in state: Dict[anomalyId_stepNumber, boolean]
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  // Reset checklist when anomalies change or resolve
  useEffect(() => {
    // Keep previously completed steps if still relevant
  }, [anomalies]);

  const toggleStep = (key: string) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const resetAll = () => {
    setCompletedSteps({});
  };

  if (anomalies.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#070b14]/90 p-5 backdrop-blur flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-100">
              Nominal In-Flight Countermeasure Protocols
            </h3>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            PREVENTIVE BASELINE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
            <div>
              <div className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Daily Resistance (ARED)</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Maintain 2.5 hr daily cycle ergometer & resistive deadlift protocol to mitigate microgravity bone mineral density loss.
              </p>
            </div>
            <div className="mt-3 text-[10px] text-emerald-400 font-bold">
              STATUS: SCHEDULED (CYCLE 2)
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
            <div>
              <div className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Circadian Phase Entrainment</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Dynamic blue-enriched LED lighting in crew quarters set to 480nm for circadian phase alignment and sleep latency optimization.
              </p>
            </div>
            <div className="mt-3 text-[10px] text-emerald-400 font-bold">
              STATUS: DAYLIGHT PHASE (ON)
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
            <div>
              <div className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>ECLSS Gas Balance Check</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Atmosphere loop balance: O₂ 21.3 kPa, N₂ 79.5 kPa, CO₂ 540 ppm. Total cabin pressure 101.3 kPa (14.7 psi).
              </p>
            </div>
            <div className="mt-3 text-[10px] text-emerald-400 font-bold">
              STATUS: BALANCED (100%)
            </div>
          </div>
        </div>
      </div>
    );
  }

  const primary = anomalies[0];
  const steps = primary.countermeasures || [];
  const completedCount = steps.filter((s) => completedSteps[`${primary.id}_${s.step_number}`]).length;
  const progressPercent = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;
  const isAllComplete = steps.length > 0 && completedCount === steps.length;

  return (
    <div
      id="countermeasures-section"
      className="rounded-xl border border-red-500/80 bg-[#0c0812]/95 p-5 backdrop-blur flex flex-col gap-4 shadow-xl glow-crimson"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-900/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-600 text-white animate-pulse">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-base font-black uppercase tracking-wider text-white">
                Emergency Countermeasure Directives
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-900 text-red-200 border border-red-600 animate-alert-fast">
                {primary.protocol_code}
              </span>
            </div>
            <p className="text-xs text-red-300 font-mono mt-0.5">
              Execute prescribed clinical checklist immediately. Check each step once verified.
            </p>
          </div>
        </div>

        {/* Progress & Reset */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-lg border border-red-800">
            <span className="text-slate-300">COMPLETION:</span>
            <span className={`font-bold ${isAllComplete ? "text-emerald-400" : "text-amber-400"}`}>
              {completedCount} / {steps.length} ({progressPercent.toFixed(0)}%)
            </span>
          </div>

          <button
            onClick={resetAll}
            title="Reset Checklist"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-red-950">
        <div
          className={`h-full transition-all duration-300 ${
            isAllComplete ? "bg-emerald-500" : "bg-gradient-to-r from-amber-500 to-red-500"
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {steps.map((step) => {
          const stepKey = `${primary.id}_${step.step_number}`;
          const isDone = !!completedSteps[stepKey];

          return (
            <div
              key={step.step_number}
              onClick={() => toggleStep(stepKey)}
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                isDone
                  ? "border-emerald-600/70 bg-emerald-950/25 text-emerald-200"
                  : "border-red-800/80 bg-red-950/30 hover:border-red-500 text-slate-100"
              }`}
            >
              <div>
                {/* Step Top Bar */}
                <div className="flex items-center justify-between gap-2 mb-2 font-mono">
                  <div className="flex items-center gap-2">
                    {isDone ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-red-400" />
                    )}
                    <span className="font-black text-xs uppercase tracking-wider text-slate-300">
                      STEP {step.step_number}: {step.title}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isDone
                        ? "bg-emerald-900/80 text-emerald-300 border border-emerald-600"
                        : "bg-red-900/80 text-red-300 border border-red-600"
                    }`}
                  >
                    {isDone ? "VERIFIED" : "PENDING"}
                  </span>
                </div>

                {/* Directive Text ("Grandma Theory": direct, clear language) */}
                <p className={`text-sm font-sans mt-1 leading-relaxed ${isDone ? "line-through text-slate-400" : "text-slate-100 font-medium"}`}>
                  {step.directive}
                </p>
              </div>

              {/* Step Footer Tags */}
              <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SUBSYSTEM: {step.subsystem}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Clock className="w-3 h-3" />
                    <span>&lt; {step.target_window_seconds}s</span>
                  </span>

                  {step.requires_flight_director_signoff && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-600 text-purple-300 text-[10px] font-bold">
                      FLIGHT DIR SIGNOFF
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isAllComplete && (
        <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-500 text-emerald-300 font-mono text-xs flex items-center justify-between">
          <span className="font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ALL EMERGENCY COUNTERMEASURE ACTIONS VERIFIED AND COMPLETE.
          </span>
          <span className="text-slate-400">Houston Med-Ops Telemetry Logged</span>
        </div>
      )}
    </div>
  );
};
