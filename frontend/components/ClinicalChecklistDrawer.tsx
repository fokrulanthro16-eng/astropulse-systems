"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  CheckSquare, 
  Square, 
  ShieldAlert, 
  Clock, 
  Cpu, 
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Flame,
  Zap,
  Activity,
  CheckCircle2,
  Syringe,
  Wind,
  Layers,
  ArrowRight
} from "lucide-react";
import { AnomalyRecord, TelemetryPacket } from "@/lib/types";

interface ClinicalChecklistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryPacket | null;
  onResolveAnomaly: () => void;
}

const DEFAULT_STEPS = [
  {
    step_number: 1,
    title: "O2 Mask Sealed & 100% FiO2 Verified",
    directive: "Immediately don and verify seal of Emergency Oxygen Mask. Set delivery regulator to 100% FiO2 at 12 L/min continuous positive pressure.",
    subsystem: "ECLSS-O2-EMERGENCY",
    target_window_seconds: 30,
    requires_flight_director_signoff: false,
    clinical_category: "O2_DELIVERY"
  },
  {
    step_number: 2,
    title: "ECLSS Scrubber Valve Stage-2 Override",
    directive: "Engage manual bypass solenoid on ECLSS Primary O2 regulator valve line 4B / CDRA Desorb Bed B. Purge suit atmosphere loop.",
    subsystem: "ECLSS-VALVE-O2B",
    target_window_seconds: 60,
    requires_flight_director_signoff: true,
    clinical_category: "ECLSS_OVERRIDE"
  },
  {
    step_number: 3,
    title: "IV Fluid Saline Prep & Preload Infusion",
    directive: "Stage peripheral IV catheter and prepare 500 mL normal saline (0.9% NaCl) bolus infusion to counter microgravity peripheral pooling.",
    subsystem: "MED-PHARMA-INFUSION",
    target_window_seconds: 120,
    requires_flight_director_signoff: false,
    clinical_category: "PHARMA_SALINE"
  },
  {
    step_number: 4,
    title: "Restrict High-g Movement & Supine Posture",
    directive: "Astronaut to halt physical exertion; assume recumbent posture with lower limbs elevated to maximize cerebral and coronary oxygen perfusion.",
    subsystem: "CREW-ERGONOMICS",
    target_window_seconds: 180,
    requires_flight_director_signoff: false,
    clinical_category: "RESTRICT_MOVEMENT"
  }
];

export const ClinicalChecklistDrawer: React.FC<ClinicalChecklistDrawerProps> = ({
  isOpen,
  onClose,
  telemetry,
  onResolveAnomaly,
}) => {
  // Hooks MUST be declared at the very top of the component body, BEFORE any early return statements
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [stepTimestamps, setStepTimestamps] = useState<Record<string, string>>({});

  const anomalies = telemetry?.anomalies || [];
  const primaryAnomaly = anomalies[0];
  const steps = primaryAnomaly?.countermeasures || DEFAULT_STEPS;
  const anomalyId = primaryAnomaly?.id || "ANOM-GENERIC";

  const completedCount = steps.filter((s) => completedSteps[`${anomalyId}_${s.step_number}`]).length;
  const totalCount = steps.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isAllComplete = completedCount === totalCount && totalCount > 0;

  // Level-3 Dynamic Closed-Loop Clinical Recovery:
  // Hook runs unconditionally on every render, but executes the side effect conditionally inside the effect body
  useEffect(() => {
    if (isOpen && isAllComplete && onResolveAnomaly) {
      onResolveAnomaly();
    }
  }, [isOpen, isAllComplete, onResolveAnomaly]);

  const toggleStep = (stepNumber: number) => {
    const key = `${anomalyId}_${stepNumber}`;
    const nextState = !completedSteps[key];
    setCompletedSteps((prev) => ({ ...prev, [key]: nextState }));
    
    if (nextState) {
      const now = new Date().toLocaleTimeString("en-US", { hour12: false });
      setStepTimestamps((prev) => ({ ...prev, [key]: `${now} UTC - VERIFIED` }));
    } else {
      setStepTimestamps((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const resetSteps = () => {
    setCompletedSteps({});
    setStepTimestamps({});
  };

  const getCategoryIcon = (cat?: string) => {
    switch (cat) {
      case "O2_DELIVERY":
        return <Wind className="w-3.5 h-3.5 text-cyan-400" />;
      case "ECLSS_OVERRIDE":
        return <Cpu className="w-3.5 h-3.5 text-amber-400" />;
      case "PHARMA_SALINE":
        return <Syringe className="w-3.5 h-3.5 text-emerald-400" />;
      case "RESTRICT_MOVEMENT":
        return <Layers className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Early return ONLY after all hooks have been declared and executed
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl h-full bg-[#070b14] border-l border-red-500/80 shadow-[0_0_50px_rgba(239,68,68,0.25)] flex flex-col justify-between overflow-hidden">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 bg-[#090e1a]/95 backdrop-blur flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-red-600/90 text-white animate-pulse">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-700">
                  NASA FLIGHT MEDICINE SOP
                </span>
                <h2 className="text-lg font-black font-mono tracking-tight text-white mt-1 uppercase">
                  {primaryAnomaly ? primaryAnomaly.title : "CLINICAL EMERGENCY CHECKLIST"}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub-meta details: MET, Astronaut, Protocol */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-300 pt-1">
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-cyan-400 font-bold">
              PATIENT: {telemetry?.astronaut_name || "CDR Vance"} ({telemetry?.astronaut_id || "CDR-01"})
            </span>
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
              {telemetry?.mission_elapsed_time || "MET 042:14:28:00"}
            </span>
            <span className="bg-red-950/80 px-2 py-0.5 rounded border border-red-800 text-red-300 font-bold">
              PROTOCOL: {primaryAnomaly?.protocol_code || "NASA-FLIGHT-MED-ECLSS-09B"}
            </span>
          </div>

          {/* Edge ML Diagnostic Ribbon */}
          <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800 flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-slate-400">Edge ML Confidence:</span>
              <span className="text-cyan-300 font-bold">{telemetry?.ml_confidence_pct ?? 92.4}%</span>
            </div>
            <div className="text-[11px] text-amber-300 font-semibold truncate max-w-[260px]">
              Driver: {telemetry?.primary_contributing_vector || "Arterial O2 Desaturation"}
            </div>
          </div>
        </div>

        {/* Real-Time Mitigation Progress Bar */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex flex-col gap-2 font-mono">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold tracking-wider uppercase flex items-center gap-1.5">
              <span>Mitigation Progress:</span>
              <span className={isAllComplete ? "text-emerald-400" : "text-amber-400"}>
                {completedCount} of {totalCount} Steps Verified ({progressPercent.toFixed(0)}%)
              </span>
            </span>

            <button
              onClick={resetSteps}
              title="Reset Checklist"
              className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                isAllComplete
                  ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                  : "bg-gradient-to-r from-amber-500 via-rose-500 to-red-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* SOP Steps Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3.5">
          <div className="text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase">
            Mandatory Clinical Directives (Execute Sequentially):
          </div>

          {steps.map((step) => {
            const stepKey = `${anomalyId}_${step.step_number}`;
            const isDone = !!completedSteps[stepKey];
            const timestamp = stepTimestamps[stepKey];

            return (
              <div
                key={step.step_number}
                onClick={() => toggleStep(step.step_number)}
                className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                  isDone
                    ? "border-emerald-600/80 bg-emerald-950/20 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    : "border-slate-800 bg-[#0c1220]/90 hover:border-red-600/70 text-slate-200"
                }`}
              >
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between gap-2 mb-2 font-mono">
                    <div className="flex items-center gap-2.5">
                      {isDone ? (
                        <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-red-400 flex-shrink-0" />
                      )}
                      <span className="font-black text-xs uppercase tracking-wider text-slate-100">
                        STEP {step.step_number}: {step.title}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        isDone
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                          : "bg-red-950 text-red-300 border border-red-800"
                      }`}
                    >
                      {isDone ? "VERIFIED" : "PENDING"}
                    </span>
                  </div>

                  {/* Directive Text */}
                  <p className={`text-sm font-sans leading-relaxed ${isDone ? "line-through text-slate-400" : "text-slate-200 font-medium"}`}>
                    {step.directive}
                  </p>
                </div>

                {/* Footer Subsystems & Verification Meta */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    {getCategoryIcon(step.clinical_category)}
                    <span>{step.subsystem}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Clock className="w-3 h-3" />
                      <span>&lt; {step.target_window_seconds}s</span>
                    </span>

                    {step.requires_flight_director_signoff && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-700 text-purple-300 text-[10px] font-bold">
                        HOUSTON SIGNOFF
                      </span>
                    )}
                  </div>
                </div>

                {/* Verification Timestamp */}
                {timestamp && (
                  <div className="mt-2 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{timestamp}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Drawer Bottom Action Bar */}
        <div className="p-5 border-t border-slate-800 bg-[#090e1a] flex flex-col gap-3 font-mono">
          {telemetry?.clinical_recovery_active ? (
            <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 flex items-center justify-between text-xs animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="font-bold uppercase tracking-wider text-white">Closed-Loop Recovery Active</div>
                  <div className="text-[11px] text-emerald-300">Smooth 15s physiological trajectory in progress...</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-black/60 border border-emerald-600 font-bold text-emerald-400 tabular-nums">
                {telemetry.clinical_recovery_seconds_remaining}s REMAINING
              </span>
            </div>
          ) : (
            <button
              onClick={() => {
                onResolveAnomaly();
                onClose();
              }}
              disabled={!isAllComplete}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg ${
                isAllComplete
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.5)] font-black animate-pulse"
                  : "bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed"
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>
                {isAllComplete
                  ? "RESOLVED / RETURN TO NOMINAL"
                  : `VERIFY ALL ${totalCount} STEPS TO ENGAGE CLOSED-LOOP RECOVERY (${completedCount}/${totalCount})`}
              </span>
            </button>
          )}

          <p className="text-[10px] text-slate-500 text-center font-mono">
            Resolution command triggers automatic ECLSS normalization and sends telemetry confirmation to Houston Med-Ops.
          </p>
        </div>

      </div>
    </div>
  );
};
