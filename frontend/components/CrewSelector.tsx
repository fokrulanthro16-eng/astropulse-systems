"use client";

import React from "react";
import { User, ShieldAlert, Heart, Activity } from "lucide-react";
import { CrewOverviewItem } from "@/lib/types";

interface CrewSelectorProps {
  crewList: CrewOverviewItem[];
  selectedId: string;
  onSelectAstronaut: (id: string) => void;
}

export const CrewSelector: React.FC<CrewSelectorProps> = ({
  crewList,
  selectedId,
  onSelectAstronaut,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {crewList.map((crew) => {
        const isSelected = crew.id === selectedId;
        const isCritical = crew.overall_status === "CRITICAL";
        const isWarning = crew.overall_status === "WARNING";

        let statusBorder = "border-slate-800 hover:border-slate-700 bg-slate-950/60";
        let statusBadge = "bg-emerald-950/80 text-emerald-400 border-emerald-800";

        if (isCritical) {
          statusBorder = "border-red-600/80 bg-red-950/30 glow-crimson animate-pulse";
          statusBadge = "bg-red-900 text-red-200 border-red-500 animate-alert-fast";
        } else if (isWarning) {
          statusBorder = "border-amber-600/80 bg-amber-950/20 glow-amber";
          statusBadge = "bg-amber-900 text-amber-200 border-amber-500";
        } else if (isSelected) {
          statusBorder = "border-cyan-500 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.25)]";
        }

        return (
          <button
            key={crew.id}
            onClick={() => onSelectAstronaut(crew.id)}
            className={`text-left p-3.5 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between ${statusBorder}`}
          >
            {/* Active Astronaut indicator bar */}
            {isSelected && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-500" />
            )}

            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${
                  isSelected ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-900 text-slate-400"
                }`}>
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">{crew.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      {crew.callsign}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">{crew.role}</div>
                </div>
              </div>

              {/* Status Pill */}
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${statusBadge}`}>
                {crew.overall_status}
              </span>
            </div>

            {/* Quick Micro Vitals */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Heart className={`w-3.5 h-3.5 ${isCritical ? "text-red-400 fill-red-400 animate-ping" : "text-rose-400"}`} />
                <span className="tabular-nums font-bold">{Math.round(crew.heart_rate)}</span>
                <span className="text-[10px] text-slate-500">bpm</span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-300">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span className="tabular-nums font-bold">{crew.spo2.toFixed(1)}</span>
                <span className="text-[10px] text-slate-500">% O₂</span>
              </div>

              {crew.anomaly_count > 0 ? (
                <div className="flex items-center gap-1 text-red-400 font-bold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{crew.anomaly_count} ALERT{crew.anomaly_count > 1 ? "S" : ""}</span>
                </div>
              ) : (
                <span className="text-emerald-400 font-bold text-[11px]">ALL SAFE</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
