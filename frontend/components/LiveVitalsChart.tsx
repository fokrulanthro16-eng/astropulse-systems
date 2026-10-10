"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { ChartDataPoint } from "@/lib/types";
import { Activity, Heart, Sparkles, CloudRain } from "lucide-react";

interface LiveVitalsChartProps {
  data: ChartDataPoint[];
}

type ViewMode = "ALL" | "HR" | "SPO2" | "HRV" | "CO2";

export const LiveVitalsChart: React.FC<LiveVitalsChartProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<ViewMode>("ALL");

  return (
    <div className="rounded-xl border border-slate-800 bg-[#070b14]/90 p-5 backdrop-blur flex flex-col gap-4">
      {/* Top Header & Chart Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Telemetry Trend Waves (1Hz Live Rolling Buffer)</span>
            </h3>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Continuous sliding window tracking cardiovascular stability, arterial oxygenation & atmospheric dynamics.
          </p>
        </div>

        {/* View Mode Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode("ALL")}
            className={`px-3 py-1 rounded font-bold transition-all ${
              viewMode === "ALL"
                ? "bg-cyan-500 text-black shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            TRI-VECTOR
          </button>
          <button
            onClick={() => setViewMode("HR")}
            className={`px-3 py-1 rounded font-bold transition-all flex items-center gap-1 ${
              viewMode === "HR"
                ? "bg-rose-500 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Heart className="w-3 h-3" /> HR
          </button>
          <button
            onClick={() => setViewMode("SPO2")}
            className={`px-3 py-1 rounded font-bold transition-all flex items-center gap-1 ${
              viewMode === "SPO2"
                ? "bg-cyan-500 text-black shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-3 h-3" /> SpO₂
          </button>
          <button
            onClick={() => setViewMode("HRV")}
            className={`px-3 py-1 rounded font-bold transition-all flex items-center gap-1 ${
              viewMode === "HRV"
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3 h-3" /> HRV
          </button>
          <button
            onClick={() => setViewMode("CO2")}
            className={`px-3 py-1 rounded font-bold transition-all flex items-center gap-1 ${
              viewMode === "CO2"
                ? "bg-emerald-500 text-black shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <CloudRain className="w-3 h-3" /> CO₂
          </button>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="h-[280px] w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 font-mono text-sm">
            Acquiring biotelemetry synchronization packet...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />

              <XAxis
                dataKey="timeStr"
                stroke="#64748b"
                tick={{ fontSize: 11, fill: "#64748b", fontFamily: "monospace" }}
                tickLine={false}
              />

              {/* Y Axis per view mode */}
              {viewMode === "ALL" && (
                <YAxis
                  yAxisId="left"
                  domain={[40, 160]}
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: "#64748b", fontFamily: "monospace" }}
                  tickLine={false}
                  label={{ value: "HR (bpm) / HRV (ms)", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 10 }}
                />
              )}
              {viewMode === "ALL" && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[75, 100]}
                  stroke="#06b6d4"
                  tick={{ fontSize: 11, fill: "#06b6d4", fontFamily: "monospace" }}
                  tickLine={false}
                  label={{ value: "SpO2 (%)", angle: 90, position: "insideRight", fill: "#06b6d4", fontSize: 10 }}
                />
              )}

              {viewMode === "HR" && (
                <YAxis
                  domain={[40, 160]}
                  stroke="#f43f5e"
                  tick={{ fontSize: 11, fill: "#f43f5e", fontFamily: "monospace" }}
                  tickLine={false}
                />
              )}

              {viewMode === "SPO2" && (
                <YAxis
                  domain={[70, 100]}
                  stroke="#06b6d4"
                  tick={{ fontSize: 11, fill: "#06b6d4", fontFamily: "monospace" }}
                  tickLine={false}
                />
              )}

              {viewMode === "HRV" && (
                <YAxis
                  domain={[0, 90]}
                  stroke="#818cf8"
                  tick={{ fontSize: 11, fill: "#818cf8", fontFamily: "monospace" }}
                  tickLine={false}
                />
              )}

              {viewMode === "CO2" && (
                <YAxis
                  domain={[200, 5000]}
                  stroke="#10b981"
                  tick={{ fontSize: 11, fill: "#10b981", fontFamily: "monospace" }}
                  tickLine={false}
                />
              )}

              <Tooltip
                contentStyle={{
                  backgroundColor: "#030712",
                  borderColor: "#334155",
                  borderRadius: "0.5rem",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  color: "#f8fafc",
                }}
              />

              {/* Reference Danger Lines */}
              {(viewMode === "ALL" || viewMode === "SPO2") && (
                <ReferenceLine
                  yAxisId={viewMode === "ALL" ? "right" : undefined}
                  y={90}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: "SPO2 HYPOXIA LIMIT (90%)", fill: "#ef4444", fontSize: 10, position: "right" }}
                />
              )}

              {(viewMode === "ALL" || viewMode === "HR") && (
                <ReferenceLine
                  yAxisId={viewMode === "ALL" ? "left" : undefined}
                  y={120}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{ value: "HR TACHYCARDIA (120 BPM)", fill: "#f59e0b", fontSize: 10 }}
                />
              )}

              {(viewMode === "ALL" || viewMode === "HRV") && (
                <ReferenceLine
                  yAxisId={viewMode === "ALL" ? "left" : undefined}
                  y={20}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: "HRV CRITICAL LOW (20 MS)", fill: "#ef4444", fontSize: 10 }}
                />
              )}

              {viewMode === "CO2" && (
                <ReferenceLine
                  y={3000}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: "CO2 TOXIC LEVEL (3,000 PPM)", fill: "#ef4444", fontSize: 10 }}
                />
              )}

              {/* Render Lines */}
              {(viewMode === "ALL" || viewMode === "HR") && (
                <Line
                  yAxisId={viewMode === "ALL" ? "left" : undefined}
                  type="monotone"
                  dataKey="heartRate"
                  name="Heart Rate (bpm)"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {(viewMode === "ALL" || viewMode === "SPO2") && (
                <Line
                  yAxisId={viewMode === "ALL" ? "right" : undefined}
                  type="monotone"
                  dataKey="spo2"
                  name="SpO2 (%)"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {(viewMode === "ALL" || viewMode === "HRV") && (
                <Line
                  yAxisId={viewMode === "ALL" ? "left" : undefined}
                  type="monotone"
                  dataKey="hrv"
                  name="HRV RMSSD (ms)"
                  stroke="#818cf8"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {viewMode === "CO2" && (
                <Line
                  type="monotone"
                  dataKey="cabinCo2"
                  name="Cabin CO2 (ppm)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend & Current Indicators */}
      <div className="flex flex-wrap items-center justify-between text-xs font-mono pt-2 border-t border-slate-800 text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Heart Rate (bpm)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>Blood Oxygen SpO₂ (%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            <span>HRV RMSSD (ms)</span>
          </span>
        </div>
        <div className="text-slate-500 text-[11px]">
          Sample Frequency: 1.00 Hz (Fixed Aerospace Telemetry Interval)
        </div>
      </div>
    </div>
  );
};
