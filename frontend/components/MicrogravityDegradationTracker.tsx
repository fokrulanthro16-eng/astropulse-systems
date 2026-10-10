"use client";

import React, { useState } from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from "recharts";
import { 
  Bone, 
  Radiation, 
  ShieldAlert, 
  TrendingDown, 
  Activity, 
  Calendar, 
  Dna,
  ShieldCheck,
  Zap,
  Info
} from "lucide-react";

interface MicrogravityDegradationTrackerProps {
  currentMissionDay?: number;
  astronautName?: string;
}

export const MicrogravityDegradationTracker: React.FC<MicrogravityDegradationTrackerProps> = ({
  currentMissionDay = 42,
  astronautName = "Sarah Vance",
}) => {
  const [selectedHorizon, setSelectedHorizon] = useState<number>(30); // 30, 60, 90, 180 days

  // Generate 30-day (or chosen horizon) data points
  // BMD loss rate: -1.2% per 30 days (-0.04% per day)
  // Radiation dose: ~0.85 mSv per day
  const chartData = [];
  const totalDays = selectedHorizon;
  const startDay = Math.max(1, currentMissionDay - totalDays + 1);

  for (let i = 0; i <= totalDays; i += Math.max(1, Math.floor(totalDays / 15))) {
    const day = startDay + i;
    // Unmitigated BMD loss: -1.2% per 30 days
    const unmitigatedBmdLoss = -((i / 30.0) * 1.2);
    // Mitigated with ARED exercise (65% preserved):
    const mitigatedBmdLoss = unmitigatedBmdLoss * 0.38;
    // Cumulative radiation: ~0.82 mSv / day
    const cumulativeRadiationMsv = (day * 0.82);

    chartData.push({
      dayStr: `Day ${day}`,
      dayNum: day,
      unmitigatedBmd: parseFloat(unmitigatedBmdLoss.toFixed(2)),
      mitigatedBmd: parseFloat(mitigatedBmdLoss.toFixed(2)),
      radiationMsv: parseFloat(cumulativeRadiationMsv.toFixed(1)),
      femoralNeckTScore: parseFloat((0.8 - (i / 30.0) * 0.08).toFixed(2)),
    });
  }

  const current30DayBmdLoss = -1.20;
  const currentCumulativeRadiation = (currentMissionDay * 0.82).toFixed(1);
  const careerLimitMsv = 600.0;
  const radiationCareerPercent = ((parseFloat(currentCumulativeRadiation) / careerLimitMsv) * 100).toFixed(1);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#070b14]/95 p-6 backdrop-blur flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Tracker Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-950 border border-purple-600/50 text-purple-300">
              <Dna className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-base font-black uppercase tracking-wider text-slate-100">
                  Long-Duration Microgravity Degradation Analytics
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                  30-DAY BIO-SURVEILLANCE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Tracking cumulative osteopenia bone resorption (-1.2%/mo) and deep space galactic cosmic ray dosimetry.
              </p>
            </div>
          </div>
        </div>

        {/* Horizon selector buttons */}
        <div className="flex items-center gap-1.5 font-mono text-xs bg-slate-950 p-1 rounded-lg border border-slate-800">
          {[30, 60, 90, 180].map((horizon) => (
            <button
              key={horizon}
              onClick={() => setSelectedHorizon(horizon)}
              className={`px-3 py-1 rounded font-bold transition-all ${
                selectedHorizon === horizon
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {horizon} DAYS
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards: BMD Resorption & Radiation Dosimetry */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {/* Card 1: Monthly BMD Degradation Rate */}
        <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider">BMD RESORPTION RATE</span>
            <Bone className="w-4 h-4 text-rose-400" />
          </div>
          <div className="my-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-400 tabular-nums">
              {current30DayBmdLoss.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400 uppercase">/ 30 Days</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Femoral Neck & Spine</span>
            <span className="text-rose-400 font-bold">UNMITIGATED</span>
          </div>
        </div>

        {/* Card 2: Mitigated BMD with ARED */}
        <div className="p-4 rounded-xl border border-emerald-900/60 bg-emerald-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider">ARED MITIGATED RATE</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-300 tabular-nums">
              -0.45%
            </span>
            <span className="text-xs text-slate-400 uppercase">/ 30 Days</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Preserved with 2.5h ARED</span>
            <span className="text-emerald-400 font-bold">62% OFFSET</span>
          </div>
        </div>

        {/* Card 3: Cumulative Radiation Dose */}
        <div className="p-4 rounded-xl border border-amber-900/60 bg-amber-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider">CUMULATIVE GCR DOSE</span>
            <Radiation className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div className="my-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-300 tabular-nums">
              {currentCumulativeRadiation}
            </span>
            <span className="text-xs text-slate-400 uppercase">mSv</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Rate: 0.82 mSv/day</span>
            <span className="text-amber-400 font-bold">DAY {currentMissionDay}</span>
          </div>
        </div>

        {/* Card 4: Career Limit Consumption */}
        <div className="p-4 rounded-xl border border-cyan-900/60 bg-cyan-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider">NASA CAREER LIMIT</span>
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-black text-cyan-300 tabular-nums">
              {radiationCareerPercent}%
            </span>
            <span className="text-xs text-slate-400 uppercase">of 600 mSv</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Remaining: {(careerLimitMsv - parseFloat(currentCumulativeRadiation)).toFixed(0)} mSv</span>
            <span className="text-emerald-400 font-bold">NOMINAL SAFE</span>
          </div>
        </div>
      </div>

      {/* Main Charts: Two Parallel Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Panel 1: Bone Mineral Density Trajectory */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col gap-3">
          <div className="flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <Bone className="w-4 h-4 text-rose-400" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Bone Demineralization Curve (% Loss vs Baseline)
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Target: &lt; -1.5% / mo</span>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis dataKey="dayStr" stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b", fontFamily: "monospace" }} />
                <YAxis domain={[-8.0, 0.5]} stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b", fontFamily: "monospace" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#030712", borderColor: "#334155", fontFamily: "monospace", fontSize: "11px" }}
                />
                <ReferenceLine y={-1.2} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: "30-DAY LIMIT (-1.2%)", fill: "#f43f5e", fontSize: 9 }} />
                <Line type="monotone" dataKey="unmitigatedBmd" name="Unmitigated Loss (%)" stroke="#f43f5e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="mitigatedBmd" name="ARED Mitigated Loss (%)" stroke="#10b981" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Unmitigated Loss (-1.2%/mo)</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>ARED Offset (-0.45%/mo)</span>
            </span>
          </div>
        </div>

        {/* Panel 2: Cumulative Galactic Radiation Exposure */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col gap-3">
          <div className="flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <Radiation className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Cumulative Deep Space Ionizing Dose (mSv)
              </span>
            </div>
            <span className="text-[10px] text-amber-400">GCR Ambient Rate ~0.82 mSv/d</span>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis dataKey="dayStr" stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b", fontFamily: "monospace" }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b", fontFamily: "monospace" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#030712", borderColor: "#334155", fontFamily: "monospace", fontSize: "11px" }}
                />
                <Area type="monotone" dataKey="radiationMsv" name="Cumulative Dose (mSv)" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
            <span className="text-amber-300">
              Active Astronaut: {astronautName} (Orion Storm Shelter Status: GREEN)
            </span>
            <span className="text-cyan-400 font-bold">
              DOSIMETER: ACTIVE
            </span>
          </div>
        </div>

      </div>

      {/* Clinical Countermeasure Guidance */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-purple-300">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>Clinical Directive: Maintain 2.5 hr daily cycle ergometer & deadlift protocol to suppress osteoclast bone resorption.</span>
        </div>
        <div className="px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-700 font-bold text-[10px]">
          PROTOCOL: NASA-HRP-BMD-01
        </div>
      </div>
    </div>
  );
};
