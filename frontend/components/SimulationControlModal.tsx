"use client";

import React, { useState } from "react";
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Wind, 
  Heart, 
  CloudRain, 
  ShieldAlert,
  Play,
  RotateCcw
} from "lucide-react";
import { SimulationMode } from "@/lib/types";

interface SimulationControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: SimulationMode;
  onTriggerScenario: (mode: SimulationMode, overrides?: { spo2?: number; hr?: number; co2?: number }) => void;
  onReset: () => void;
}

interface ScenarioOption {
  mode: SimulationMode;
  title: string;
  badge: string;
  severity: "nominal" | "caution" | "critical";
  description: string;
  keyVectors: string;
  icon: React.ReactNode;
}

const SCENARIOS: ScenarioOption[] = [
  {
    mode: "NORMAL",
    title: "Nominal Flight Operations",
    badge: "BASELINE",
    severity: "nominal",
    description: "Restores normal aerospace physiological baseline. O₂ sat 98.6%, HR 68 bpm, CO₂ 540 ppm.",
    keyVectors: "SpO2: 98-99% | HR: 60-80 bpm | CO2: <800 ppm",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
  },
  {
    mode: "HYPOXIA_CRITICAL",
    title: "Critical Hypoxia / O2 Loop Depletion",
    badge: "CRITICAL EMERGENCY",
    severity: "critical",
    description: "ECLSS primary O₂ regulator valve failure. Induces rapid arterial desaturation (<85%), compensatory tachycardia (>130 bpm).",
    keyVectors: "SpO2: 82.5% | HR: 132 bpm | Resp: 26 br/min",
    icon: <Wind className="w-5 h-5 text-red-400" />,
  },
  {
    mode: "HYPERCAPNIA_CRISIS",
    title: "Hypercapnia / ECLSS Scrubber Failure",
    badge: "CRITICAL TOXICITY",
    severity: "critical",
    description: "CDRA desorber bed saturation. Environmental CO₂ climbs above 4,000 ppm, inducing respiratory acidosis and hyperventilation.",
    keyVectors: "Cabin CO2: 4,250 ppm | Resp: 25 br/min | Systolic: 142 mmHg",
    icon: <CloudRain className="w-5 h-5 text-red-400" />,
  },
  {
    mode: "CARDIAC_DECONDITIONING",
    title: "Microgravity Cardiac Deconditioning",
    badge: "AUTONOMIC DISTRESS",
    severity: "caution",
    description: "Loss of parasympathetic cardiac autonomic buffer. HRV RMSSD collapses (<18 ms) with persistent resting tachycardia (>100 bpm).",
    keyVectors: "HRV RMSSD: 16 ms | HR: 104 bpm (resting) | Narrow Pulse Pressure",
    icon: <Heart className="w-5 h-5 text-amber-400" />,
  },
  {
    mode: "RAPID_DECOMPRESSION",
    title: "Rapid Cabin / Suit Decompression",
    badge: "CATASTROPHIC RISK",
    severity: "critical",
    description: "Micro-meteoroid breach or suit seal failure. Ambient pressure drops below 2.5 psi with profound hypoxemia.",
    keyVectors: "Suit Press: 2.1 psi | SpO2: 78% | HR: 145 bpm",
    icon: <ShieldAlert className="w-5 h-5 text-red-400" />,
  },
];

export const SimulationControlModal: React.FC<SimulationControlModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onTriggerScenario,
  onReset,
}) => {
  const [selectedMode, setSelectedMode] = useState<SimulationMode>(currentMode);
  const [customSpo2, setCustomSpo2] = useState<string>("");
  const [customHr, setCustomHr] = useState<string>("");
  const [customCo2, setCustomCo2] = useState<string>("");

  if (!isOpen) return null;

  const handleApply = () => {
    const overrides: { spo2?: number; hr?: number; co2?: number } = {};
    if (customSpo2) overrides.spo2 = parseFloat(customSpo2);
    if (customHr) overrides.hr = parseFloat(customHr);
    if (customCo2) overrides.co2 = parseFloat(customCo2);

    onTriggerScenario(selectedMode, Object.keys(overrides).length > 0 ? overrides : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-[#090e18] border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black font-mono tracking-wider uppercase text-slate-100">
                In-Flight Crisis Simulation Injector
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Inject controlled physiological anomalies to test flight-surgeon countermeasures.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenario List */}
        <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
          {SCENARIOS.map((scen) => {
            const isSelected = selectedMode === scen.mode;
            const isCurrentActive = currentMode === scen.mode;

            let cardBorder = "border-slate-800 bg-slate-950/60 hover:border-slate-700";
            if (isSelected) {
              cardBorder = scen.severity === "critical"
                ? "border-red-500 bg-red-950/30 glow-crimson"
                : scen.severity === "caution"
                ? "border-amber-500 bg-amber-950/30 glow-amber"
                : "border-emerald-500 bg-emerald-950/30";
            }

            return (
              <div
                key={scen.mode}
                onClick={() => setSelectedMode(scen.mode)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${cardBorder}`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-black/40 border border-slate-800 flex-shrink-0 mt-0.5">
                    {scen.icon}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100 font-mono">
                        {scen.title}
                      </span>
                      {isCurrentActive && (
                        <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                          CURRENTLY LIVE
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 mt-1 font-sans">
                      {scen.description}
                    </p>

                    <div className="mt-2 text-[11px] font-mono text-cyan-400/90 font-medium">
                      Vectors: {scen.keyVectors}
                    </div>
                  </div>
                </div>

                <input
                  type="radio"
                  name="scenario"
                  checked={isSelected}
                  onChange={() => setSelectedMode(scen.mode)}
                  className="mt-1.5 h-4 w-4 text-cyan-500 focus:ring-0 cursor-pointer"
                />
              </div>
            );
          })}
        </div>

        {/* Optional Custom Overrides */}
        <div className="p-3.5 rounded-xl bg-black/40 border border-slate-800">
          <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2.5">
            Optional Parameter Targets (Overrides):
          </div>
          <div className="grid grid-cols-3 gap-3 font-mono text-xs">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Target SpO2 (%)</label>
              <input
                type="number"
                placeholder="e.g. 84"
                value={customSpo2}
                onChange={(e) => setCustomSpo2(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Target HR (bpm)</label>
              <input
                type="number"
                placeholder="e.g. 135"
                value={customHr}
                onChange={(e) => setCustomHr(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Target CO2 (ppm)</label>
              <input
                type="number"
                placeholder="e.g. 4000"
                value={customCo2}
                onChange={(e) => setCustomCo2(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 font-mono text-xs">
          <button
            onClick={() => {
              onReset();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-emerald-400" />
            <span>RESET TO NOMINAL</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-transparent hover:bg-slate-900 text-slate-400 font-bold"
            >
              CANCEL
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>INJECT SCENARIO</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
