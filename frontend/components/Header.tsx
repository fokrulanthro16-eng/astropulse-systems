"use client";

import React, { useState } from "react";
import { 
  Radio, 
  Volume2, 
  VolumeX, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Sliders, 
  Activity, 
  Download, 
  FileText, 
  Database, 
  ChevronDown, 
  Zap, 
  ClipboardList,
  Dna,
  Bluetooth,
  Cpu
} from "lucide-react";
import { TelemetryPacket, SimulationStatus } from "@/lib/types";

interface HeaderProps {
  telemetry: TelemetryPacket | null;
  isConnected: boolean;
  simulationStatus: SimulationStatus | null;
  isAudioMuted: boolean;
  isAnalyticsViewActive: boolean;
  onToggleAnalyticsView: () => void;
  onToggleAudio: () => void;
  onQuickToggleCrisis: () => void;
  onOpenSimModal: () => void;
  onResetSimulation: () => void;
  onOpenChecklist: () => void;
  onExportTelemetry: (format: "json" | "csv") => void;
}

export const Header: React.FC<HeaderProps> = ({
  telemetry,
  isConnected,
  simulationStatus,
  isAudioMuted,
  isAnalyticsViewActive,
  onToggleAnalyticsView,
  onToggleAudio,
  onQuickToggleCrisis,
  onOpenSimModal,
  onResetSimulation,
  onOpenChecklist,
  onExportTelemetry,
}) => {
  const isCrisis = simulationStatus?.is_crisis_active ?? false;
  const isRecovery = simulationStatus?.clinical_recovery_active ?? false;
  const statusSeverity = telemetry?.overall_status || "NOMINAL";
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const isHardwareLinked = telemetry?.hardware_sensor_linked ?? false;

  return (
    <header className="border-b border-slate-800 bg-[#070b14]/90 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3.5">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Branding & Mission Badge */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-cyan-400">
            <Activity className="w-6 h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConnected ? "bg-emerald-400" : "bg-red-400"
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isConnected ? "bg-emerald-500" : "bg-red-500"
              }`} />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-wider text-slate-100 uppercase">
                AstroPulse <span className="text-cyan-400 font-mono">Systems</span>
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-cyan-950 text-cyan-300 border border-cyan-800">
                LEVEL 3 MISSION-GRADE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
              <span>Bio-Telemetry & Autonomous Edge ML</span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-500 font-medium">Orion ECLSS Node 2</span>
            </p>
          </div>
        </div>

        {/* Center: Mission Elapsed Time, Hardware Badge, Edge ML, and Status */}
        <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-800/80">
          <div className="text-left font-mono">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Mission Clock</div>
            <div className="text-sm font-bold text-cyan-300 tabular-nums">
              {telemetry?.mission_elapsed_time || "MET 042:14:28:00"}
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Connection status */}
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${isConnected ? "text-emerald-400 animate-pulse" : "text-red-400"}`} />
            <span className="text-xs font-mono font-medium hidden sm:inline">
              {isConnected ? (
                <span className="text-emerald-400">1Hz REALTIME STREAM</span>
              ) : (
                <span className="text-red-400">CONNECTING...</span>
              )}
            </span>
          </div>

          {/* External Hardware Sensor Linked Indicator Badge */}
          {isHardwareLinked && (
            <>
              <div className="h-6 w-px bg-slate-800" />
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/90 text-emerald-300 border border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)] font-mono text-[11px] font-bold animate-pulse">
                <Bluetooth className="w-3.5 h-3.5 text-emerald-400" />
                <span>HARDWARE SENSOR LINKED</span>
              </div>
            </>
          )}

          {/* Closed-Loop Clinical Recovery Ribbon */}
          {isRecovery && (
            <>
              <div className="h-6 w-px bg-slate-800" />
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950 text-purple-300 border border-purple-500 font-mono text-[11px] font-bold animate-pulse">
                <span>RECOVERY: {telemetry?.clinical_recovery_seconds_remaining}s</span>
              </div>
            </>
          )}

          <div className="h-6 w-px bg-slate-800" />

          {/* Edge ML Diagnostic Pill */}
          <div className="hidden xl:flex items-center gap-1.5 font-mono text-xs">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">EDGE ML:</span>
            <span className={`font-bold tabular-nums ${
              (telemetry?.ml_confidence_pct ?? 0) > 75 ? "text-red-400" : "text-emerald-400"
            }`}>
              {(telemetry?.ml_confidence_pct ?? 8.4).toFixed(1)}%
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Overall Health Pill */}
          <div className="flex items-center gap-1.5">
            {statusSeverity === "CRITICAL" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-950 text-red-400 border border-red-600 text-xs font-bold animate-alert-fast font-mono">
                <AlertTriangle className="w-3.5 h-3.5" /> CRITICAL
              </span>
            ) : statusSeverity === "WARNING" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-950 text-amber-400 border border-amber-600 text-xs font-bold font-mono">
                <AlertTriangle className="w-3.5 h-3.5" /> CAUTION
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-700/60 text-xs font-bold font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" /> NOMINAL
              </span>
            )}
          </div>
        </div>

        {/* Right: Toggle Analytics, Blackbox Export, Sound, Simulation Buttons */}
        <div className="flex items-center gap-2">
          {/* 30-Day Long-Term Exposure Analytics Toggle */}
          <button
            onClick={onToggleAnalyticsView}
            className={`px-3 py-2 rounded-lg border font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
              isAnalyticsViewActive
                ? "bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                : "bg-slate-900 border-slate-700 hover:border-purple-500 text-slate-300 hover:text-purple-300"
            }`}
            title="Toggle 30-Day Bone Demineralization & Radiation Dosimetry Tracker"
          >
            <Dna className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">30-DAY ANALYTICS</span>
          </button>

          {/* Blackbox Telemetry Downlink Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white transition-all text-xs font-mono flex items-center gap-1.5"
              title="Export 1-Hour Offline Blackbox Telemetry"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">BLACKBOX</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-[#090e18] border border-slate-700 shadow-2xl py-1.5 z-50 font-mono text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Deferred Ground Control Sync
                </div>
                <button
                  onClick={() => {
                    onExportTelemetry("json");
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-bold">Export Mission Log (.JSON)</div>
                    <div className="text-[10px] text-slate-400">Full telemetry & ML frames</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onExportTelemetry("csv");
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-bold">Export Telemetry Data (.CSV)</div>
                    <div className="text-[10px] text-slate-400">Tabular time-series records</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Clinical SOP Drawer Button */}
          <button
            onClick={onOpenChecklist}
            title="Open Clinical Flight Medicine SOP Drawer"
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
          </button>

          {/* Audio Alert Toggle */}
          <button
            onClick={onToggleAudio}
            title={isAudioMuted ? "Unmute Cockpit Audio" : "Mute Cockpit Audio"}
            className={`p-2 rounded-lg border transition-all text-xs font-mono flex items-center gap-1.5 ${
              isAudioMuted
                ? "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                : "bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
            }`}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
          </button>

          {/* Quick Simulation Crisis Toggle */}
          <button
            onClick={onQuickToggleCrisis}
            className={`px-3.5 py-2 rounded-lg font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-md ${
              isCrisis
                ? "bg-red-600 hover:bg-red-500 text-white border border-red-400 glow-crimson animate-pulse"
                : "bg-amber-600 hover:bg-amber-500 text-black border border-amber-400 font-black glow-amber"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isCrisis ? "STOP CRISIS" : "SIMULATE CRISIS"}
            </span>
          </button>

          {/* Scenario Config Button */}
          <button
            onClick={onOpenSimModal}
            title="Configure Crisis Scenarios"
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-colors"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Reset button if in crisis */}
          {isCrisis && (
            <button
              onClick={onResetSimulation}
              title="Reset to Nominal Baseline"
              className="p-2 rounded-lg bg-emerald-950 border border-emerald-600 text-emerald-400 hover:bg-emerald-900 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
